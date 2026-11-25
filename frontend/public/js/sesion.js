const CLAVE_CARRITO_INVITADO = 'carritoInvitado';
const CLAVE_FAVORITOS = 'favoritosTienda';
const CLAVE_RECIENTES = 'vistosRecientesTienda';
const PAGINAS_TIENDA = ['tienda.html', 'producto.html', 'carrito.html', 'checkout.html', 'perfil.html'];

function leerListaLocal(clave) {
    try {
        const lista = JSON.parse(localStorage.getItem(clave) || '[]');
        return Array.isArray(lista) ? lista : [];
    } catch (error) {
        return [];
    }
}

function guardarSesion(datos) {
    localStorage.setItem('token', datos.token);
    localStorage.setItem('usuario', JSON.stringify(datos.usuario));
}

function actualizarUsuarioLocal(usuario) {
    if (!usuario) return;
    localStorage.setItem('usuario', JSON.stringify(usuario));
    const enlace = document.getElementById('nombreUsuarioNav');
    if (enlace && usuario.nombre) enlace.textContent = usuario.nombre;
}

function obtenerToken() {
    return localStorage.getItem('token');
}

function obtenerUsuario() {
    try {
        return JSON.parse(localStorage.getItem('usuario'));
    } catch (error) {
        return null;
    }
}

function limpiarSesionLocal() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
}

function urlAuthConRetorno(paginaAuth, destino) {
    const actual = destino || ((location.pathname.split('/').pop() || 'tienda.html') + location.search + location.hash);
    if (!actual || actual.startsWith('login.html') || actual.startsWith('registro.html')) {
        return paginaAuth;
    }
    return `${paginaAuth}?next=${encodeURIComponent(actual)}`;
}

function urlLoginConRetorno(destino) {
    return urlAuthConRetorno('login.html', destino);
}

function obtenerDestinoPostLogin(usuario) {
    const next = (new URLSearchParams(location.search).get('next') || '').trim();
    if (next && next.includes('.html') && !next.includes('://')) {
        return next;
    }
    return usuario && usuario.rol === 'admin' ? 'dashboard.html' : 'tienda.html';
}

function cerrarSesion(opciones = {}) {
    limpiarSesionLocal();

    if (opciones.expirada) {
        const base = urlLoginConRetorno();
        location.href = base + (base.includes('?') ? '&expirada=1' : '?expirada=1');
        return;
    }

    const paginaActual = location.pathname.split('/').pop() || '';
    location.href = PAGINAS_TIENDA.includes(paginaActual) ? 'tienda.html' : 'login.html';
}

function requerirAdmin() {
    const usuario = obtenerUsuario();
    if (!obtenerToken() || !usuario || usuario.rol !== 'admin') {
        location.href = urlLoginConRetorno();
        return false;
    }
    return true;
}

function requerirUsuario() {
    const usuario = obtenerUsuario();
    if (!obtenerToken() || !usuario) {
        location.href = urlLoginConRetorno();
        return false;
    }
    return true;
}

function obtenerCarritoInvitado() {
    return leerListaLocal(CLAVE_CARRITO_INVITADO)
        .filter(i => i && i.productoId && Number(i.cantidad) >= 1)
        .map(i => ({ productoId: String(i.productoId), cantidad: Math.floor(Number(i.cantidad)) }));
}

function guardarCarritoInvitado(items) {
    localStorage.setItem(CLAVE_CARRITO_INVITADO, JSON.stringify(items || []));
    return items || [];
}

function agregarCarritoInvitado(productoId, cantidad = 1, stockDisponible = null) {
    const cant = Math.floor(Number(cantidad));
    if (!productoId || cant < 1) {
        return { ok: false, mensaje: 'La cantidad debe ser mayor o igual a 1' };
    }

    const items = obtenerCarritoInvitado();
    const existente = items.find(i => i.productoId === String(productoId));
    const nuevaCantidad = (existente ? existente.cantidad : 0) + cant;

    if (stockDisponible !== null && stockDisponible !== undefined && Number(stockDisponible) < nuevaCantidad) {
        return { ok: false, mensaje: `Stock insuficiente (disponible: ${Number(stockDisponible)})` };
    }

    if (existente) {
        existente.cantidad = nuevaCantidad;
    } else {
        items.push({ productoId: String(productoId), cantidad: cant });
    }

    guardarCarritoInvitado(items);
    return { ok: true, items };
}

function actualizarCarritoInvitado(productoId, cantidad) {
    const cant = Math.floor(Number(cantidad));
    const items = obtenerCarritoInvitado();
    if (cant < 1) {
        return guardarCarritoInvitado(items.filter(i => i.productoId !== String(productoId)));
    }
    const existente = items.find(i => i.productoId === String(productoId));
    if (existente) existente.cantidad = cant;
    return guardarCarritoInvitado(items);
}

function quitarCarritoInvitado(productoId) {
    return guardarCarritoInvitado(obtenerCarritoInvitado().filter(i => i.productoId !== String(productoId)));
}

function vaciarCarritoInvitado() {
    localStorage.removeItem(CLAVE_CARRITO_INVITADO);
}

function contarItemsCarritoInvitado() {
    return obtenerCarritoInvitado().reduce((acc, i) => acc + i.cantidad, 0);
}

async function sincronizarCarritoInvitado(usuario) {
    if (!usuario || !usuario._id) return;
    const pendientes = obtenerCarritoInvitado();
    if (!pendientes.length) return;

    for (const item of pendientes) {
        try {
            await apiFetch('/carrito/' + usuario._id + '/items', {
                method: 'POST',
                silencioso: true,
                body: JSON.stringify({ producto: item.productoId, cantidad: item.cantidad })
            });
        } catch (error) {
        }
    }

    vaciarCarritoInvitado();
}

function claveFavoritosActual() {
    const usuario = obtenerUsuario();
    return usuario && usuario._id ? `${CLAVE_FAVORITOS}_${usuario._id}` : CLAVE_FAVORITOS;
}

function obtenerFavoritos() {
    return leerListaLocal(claveFavoritosActual()).map(String);
}

function esFavorito(productoId) {
    return obtenerFavoritos().includes(String(productoId));
}

function alternarFavorito(productoId) {
    const id = String(productoId);
    const lista = obtenerFavoritos();
    const existe = lista.includes(id);
    const nueva = existe ? lista.filter(x => x !== id) : [id, ...lista];
    localStorage.setItem(claveFavoritosActual(), JSON.stringify(nueva));
    return !existe;
}

function registrarProductoVisto(productoId) {
    if (!productoId) return;
    const id = String(productoId);
    const lista = obtenerProductosVistos().filter(x => x !== id);
    lista.unshift(id);
    localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista.slice(0, 8)));
}

function obtenerProductosVistos() {
    return leerListaLocal(CLAVE_RECIENTES).map(String);
}
