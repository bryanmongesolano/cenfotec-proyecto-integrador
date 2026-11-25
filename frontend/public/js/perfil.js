let perfilActual = null;
let misPedidos = [];
let modalMiPedido;
let pedidoModalActualId = null;
const PERFIL_IMG_FALLBACK = "onerror=\"this.onerror=null;this.src='img/placeholder.svg';\"";

document.addEventListener('DOMContentLoaded', async function () {
    if (!requerirUsuario()) return;

    modalMiPedido = new bootstrap.Modal(document.getElementById('modalDetalleMiPedido'));

    activarTabDesdeHash();
    window.addEventListener('hashchange', activarTabDesdeHash);

    document.getElementById('formPerfil').addEventListener('submit', guardarPerfil);
    document.getElementById('formDireccion').addEventListener('submit', agregarDireccion);
    document.getElementById('formContrasenna').addEventListener('submit', cambiarContrasenna);
    document.getElementById('filtroEstadoMiPedido').addEventListener('change', () => renderizarMisPedidos(misPedidos));
    document.getElementById('btnCancelarEnModal').addEventListener('click', () => {
        if (pedidoModalActualId) cancelarMiPedido(pedidoModalActualId);
    });
    document.getElementById('btnReordenarEnModal').addEventListener('click', () => {
        if (pedidoModalActualId) volverAComprar(pedidoModalActualId);
    });

    await cargarCuenta();
    await cargarFavoritos();
});

function activarTabDesdeHash() {
    const mapa = {
        '#pedidos': 'tab-pedidos-btn',
        '#favoritos': 'tab-favoritos-btn',
        '#datos': 'tab-datos-btn',
        '#clave': 'tab-clave-btn'
    };
    const btnId = mapa[location.hash];
    if (!btnId) return;

    const btn = document.getElementById(btnId);
    if (btn) {
        bootstrap.Tab.getOrCreateInstance(btn).show();
    }
}

async function cargarCuenta() {
    try {
        const usuario = obtenerUsuario();
        const [perfil, pedidos] = await Promise.all([
            apiFetch('/auth/perfil'),
            apiFetch('/pedidos/usuario/' + usuario._id)
        ]);

        perfilActual = perfil;
        misPedidos = pedidos || [];

        actualizarUsuarioLocal(perfil);
        llenarFormularioPerfil(perfil);
        renderizarResumenCuenta(perfil);
        renderizarDirecciones(perfil.direcciones || []);
        renderizarMisPedidos(misPedidos);
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function renderizarResumenCuenta(perfil) {
    document.getElementById('avatarPerfil').textContent = inicialesUsuario(perfil.nombre, perfil.apellido);
    document.getElementById('tituloUsuario').textContent = `${perfil.nombre} ${perfil.apellido}`;
}

function llenarFormularioPerfil(perfil) {
    document.getElementById('subtituloUsuario').textContent = perfil.correo || '';
    document.getElementById('pNombre').value = perfil.nombre || '';
    document.getElementById('pApellido').value = perfil.apellido || '';
    document.getElementById('pApellido2').value = perfil.apellido2 || '';
    document.getElementById('pCedula').value = perfil.cedula || '';
    document.getElementById('pTelefono').value = perfil.telefono || '';
    document.getElementById('pCorreo').value = perfil.correo || '';
}

async function cargarFavoritos() {
    const contenedor = document.getElementById('grillaFavoritos');
    const ids = obtenerFavoritos();

    if (!ids.length) {
        contenedor.innerHTML = `
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-body text-center py-5">
                        <i class="bi bi-heart fs-1 text-muted d-block mb-2"></i>
                        <p class="text-muted mb-3">Aún no guardaste productos favoritos.</p>
                        <a href="tienda.html" class="btn btn-primary btn-sm rounded-pill px-4">Explorar tienda</a>
                    </div>
                </div>
            </div>`;
        return;
    }

    try {
        const todos = await apiPublica('/productos?estado=true', { silencioso: true });
        const mapa = new Map((todos || []).map(p => [p._id, p]));
        const lista = ids.map(id => mapa.get(id)).filter(Boolean);

        if (!lista.length) {
            contenedor.innerHTML = '<div class="col-12"><div class="alert alert-light border text-center small">Tus productos favoritos ya no están disponibles.</div></div>';
            return;
        }

        contenedor.innerHTML = lista.map(p => {
            const img = p.imagenes && p.imagenes.length ? p.imagenes[0] : 'img/placeholder.svg';
            const agotado = p.stock <= 0;
            return `
                <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                    <article class="card h-100 border-0 shadow-sm product-card overflow-hidden">
                        <div class="position-relative bg-white border-bottom">
                            <a href="producto.html?id=${p._id}">
                                <img src="${esc(img)}" ${PERFIL_IMG_FALLBACK} class="card-img-top" alt="${esc(p.nombre)}" />
                            </a>
                            <div class="position-absolute top-0 end-0 p-2">
                                <button type="button" class="btn btn-sm btn-danger rounded-circle shadow-sm" style="width: 34px; height: 34px;" onclick="quitarFavoritoPerfil('${p._id}')" title="Quitar de favoritos">
                                    <i class="bi bi-heart-fill"></i>
                                </button>
                            </div>
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h3 class="h6 fw-bold mb-1">
                                <a href="producto.html?id=${p._id}" class="text-decoration-none text-dark">${esc(p.nombre)}</a>
                            </h3>
                            <div class="mt-auto pt-2">
                                <div class="fw-bold text-primary mb-2 tabular-nums">${moneda(p.precio)}</div>
                                <div class="d-flex gap-2">
                                    <button type="button" class="btn btn-sm btn-primary flex-grow-1" onclick="agregarFavoritoCarrito('${p._id}')" ${agotado ? 'disabled' : ''}>
                                        <i class="bi bi-cart-plus me-1"></i>${agotado ? 'Agotado' : 'Agregar'}
                                    </button>
                                    <a href="producto.html?id=${p._id}" class="btn btn-sm btn-outline-secondary">Ver</a>
                                </div>
                            </div>
                        </div>
                    </article>
                </div>`;
        }).join('');
    } catch (error) {
        contenedor.innerHTML = `<div class="col-12"><div class="alert alert-danger small">${esc(error.message)}</div></div>`;
    }
}

function quitarFavoritoPerfil(productoId) {
    alternarFavorito(productoId);
    mostrarAlerta('Quitado de favoritos', 'info');
    cargarFavoritos();
}

async function agregarFavoritoCarrito(productoId) {
    const usuario = obtenerUsuario();
    try {
        const res = await apiFetch('/carrito/' + usuario._id + '/items', {
            method: 'POST',
            body: JSON.stringify({ producto: productoId, cantidad: 1 })
        });
        if (typeof actualizarBadgeCarrito === 'function') {
            actualizarBadgeCarrito(res.datos);
        }
        mostrarAlerta('Producto agregado al carrito');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function renderizarDirecciones(direcciones) {
    const contenedor = document.getElementById('listaDirecciones');

    if (!direcciones.length) {
        contenedor.innerHTML = '<p class="text-muted small mb-0">Aún no tenés direcciones guardadas.</p>';
        return;
    }

    contenedor.innerHTML = direcciones.map((dir, indice) => `
        <div class="border rounded-3 p-3 mb-2 d-flex justify-content-between align-items-start gap-2">
            <div class="small">
                <div class="fw-semibold text-capitalize">${esc(dir.tipo || 'casa')}${dir.esPrincipal ? ' <span class="badge bg-primary-subtle text-primary ms-1">Principal</span>' : ''}</div>
                <div>${esc([dir.provincia, dir.canton, dir.distrito, dir.codigoPostal].filter(Boolean).join(', '))}</div>
                <div class="text-muted">${esc(dir.direccionExacta || '')}</div>
            </div>
            <div class="d-flex gap-1 flex-shrink-0">
                ${!dir.esPrincipal ? `
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="hacerDireccionPrincipal(${indice})" title="Usar como dirección principal">
                        Principal
                    </button>` : ''}
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="eliminarDireccion(${indice})" aria-label="Eliminar dirección" title="Eliminar">
                    <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
            </div>
        </div>`).join('');
}

function renderizarMisPedidos(pedidos) {
    const tbody = document.getElementById('tablaMisPedidos');
    const filtro = document.getElementById('filtroEstadoMiPedido').value;
    const filtrados = filtro ? pedidos.filter(p => p.estado === filtro) : pedidos;

    if (!filtrados.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    ${pedidos.length ? 'No tenés pedidos con ese estado.' : 'Aún no tenés pedidos. <a href="tienda.html">Ir a la tienda</a>'}
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(p => {
        const cant = (p.items || []).reduce((acc, i) => acc + (i.cantidad || 0), 0);
        const puedeCancelar = p.estado === 'pendiente';
        return `
            <tr>
                <td>
                    <strong class="text-primary">${esc(p.numero)}</strong>
                    ${p.codigoCupon ? `<div><span class="badge bg-success-subtle text-success">${esc(p.codigoCupon)}</span></div>` : ''}
                </td>
                <td class="small text-muted">${esc(fechaCorta(p.fecha))}</td>
                <td class="small">${cant} artículo${cant === 1 ? '' : 's'}</td>
                <td class="text-capitalize small">${esc(p.metodoPago || '—')}</td>
                <td class="text-end fw-semibold tabular-nums">${moneda(p.total)}</td>
                <td>${badgePedido(p.estado)}</td>
                <td class="text-end text-nowrap">
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="verMiPedido('${p._id}')">Ver detalle</button>
                    ${puedeCancelar ? `<button type="button" class="btn btn-sm btn-outline-danger ms-1" onclick="cancelarMiPedido('${p._id}')">Cancelar</button>` : ''}
                </td>
            </tr>`;
    }).join('');
}

function verMiPedido(id) {
    const p = misPedidos.find(item => item._id === id);
    if (!p) return;

    pedidoModalActualId = p._id;
    const btnCancelar = document.getElementById('btnCancelarEnModal');
    if (btnCancelar) {
        btnCancelar.classList.toggle('d-none', p.estado !== 'pendiente');
    }

    const dir = p.direccionEnvio || {};
    const lineas = (p.items || []).map(i => `
        <tr>
            <td>${i.producto ? `<a href="producto.html?id=${esc(i.producto)}" class="text-decoration-none">${esc(i.nombre)}</a>` : esc(i.nombre)}</td>
            <td class="text-center">${i.cantidad}</td>
            <td class="text-end tabular-nums">${moneda(i.precioUnitario)}</td>
            <td class="text-end tabular-nums">${moneda(i.subtotal)}</td>
        </tr>`).join('');

    document.getElementById('tituloMiPedido').textContent = `Pedido ${p.numero}`;
    document.getElementById('cuerpoMiPedido').innerHTML = `
        ${renderizarStepperPedido(p.estado)}
        <div class="row g-2 mb-3 small bg-light rounded-3 p-3 border">
            <div class="col-6"><strong>Fecha:</strong> ${esc(fecha(p.fecha))}</div>
            <div class="col-6"><strong>Estado:</strong> ${badgePedido(p.estado)}</div>
            <div class="col-6"><strong>Método de pago:</strong> <span class="text-capitalize">${esc(p.metodoPago || '—')}</span></div>
            ${p.codigoCupon ? `<div class="col-6"><strong>Cupón:</strong> <span class="badge bg-success-subtle text-success">${esc(p.codigoCupon)}</span></div>` : ''}
            <div class="col-12"><strong>Entrega:</strong> ${esc([dir.provincia, dir.canton, dir.distrito, dir.codigoPostal, dir.direccionExacta].filter(Boolean).join(', '))}</div>
            ${p.motivoCancelacion ? `<div class="col-12 text-danger"><strong>Motivo cancelación:</strong> ${esc(p.motivoCancelacion)}</div>` : ''}
        </div>
        <div class="table-responsive">
            <table class="table table-sm align-middle">
                <thead class="table-light">
                    <tr>
                        <th>Producto</th>
                        <th class="text-center">Cant.</th>
                        <th class="text-end">Precio</th>
                        <th class="text-end">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${lineas}</tbody>
            </table>
        </div>
        <div class="text-end small tabular-nums">
            <div>Subtotal: ${moneda(p.subtotal)}</div>
            <div>IVA (13%): ${moneda(p.impuestos)}</div>
            <div>Envío: ${Number(p.costoEnvio) === 0 ? 'Gratis' : moneda(p.costoEnvio)}</div>
            ${p.descuento ? `<div class="text-success">Descuento: -${moneda(p.descuento)}</div>` : ''}
            <div class="fs-5 fw-bold text-primary mt-1">Total: ${moneda(p.total)}</div>
        </div>`;

    modalMiPedido.show();
}

async function volverAComprar(id) {
    const p = misPedidos.find(item => item._id === id);
    const usuario = obtenerUsuario();
    if (!p || !usuario) return;

    let agregados = 0;
    for (const item of (p.items || [])) {
        if (!item.producto) continue;
        try {
            await apiFetch('/carrito/' + usuario._id + '/items', {
                method: 'POST',
                silencioso: true,
                body: JSON.stringify({ producto: item.producto, cantidad: item.cantidad })
            });
            agregados++;
        } catch (error) {
        }
    }

    modalMiPedido.hide();
    if (agregados > 0) {
        if (typeof actualizarBadgeCarrito === 'function') await actualizarBadgeCarrito();
        mostrarAlerta(`Se agregaron ${agregados} producto(s) a tu carrito`);
    } else {
        mostrarAlerta('Los productos de este pedido ya no tienen stock disponible', 'warning');
    }
}

async function cancelarMiPedido(id) {
    const p = misPedidos.find(item => item._id === id);
    if (!p || p.estado !== 'pendiente') return;

    const modalAbierto = document.getElementById('modalDetalleMiPedido').classList.contains('show');
    if (modalAbierto) {
        modalMiPedido.hide();
    }

    const confirmado = await confirmarAccion({
        titulo: `Cancelar pedido ${p.numero}`,
        mensaje: '¿Deseás cancelar este pedido? El inventario reservado se devolverá automáticamente.',
        textoConfirmar: 'Sí, cancelar pedido'
    });
    if (!confirmado) return;

    try {
        await apiFetch('/pedidos/' + id + '/cancelar', {
            method: 'PATCH',
            body: JSON.stringify({ motivo: 'Cancelado por el cliente' })
        });
        mostrarAlerta('Pedido cancelado');
        await cargarCuenta();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function guardarPerfil(evento) {
    evento.preventDefault();

    const cuerpo = {
        nombre: document.getElementById('pNombre').value.trim(),
        apellido: document.getElementById('pApellido').value.trim(),
        apellido2: document.getElementById('pApellido2').value.trim(),
        cedula: document.getElementById('pCedula').value.trim(),
        telefono: document.getElementById('pTelefono').value.trim()
    };

    try {
        const res = await apiFetch('/auth/perfil', {
            method: 'PUT',
            body: JSON.stringify(cuerpo)
        });

        perfilActual = res.datos;
        actualizarUsuarioLocal(perfilActual);
        llenarFormularioPerfil(perfilActual);
        renderizarResumenCuenta(perfilActual);
        mostrarAlerta('Datos personales actualizados');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function agregarDireccion(evento) {
    evento.preventDefault();

    const existentes = perfilActual.direcciones || [];
    const nueva = {
        tipo: document.getElementById('dTipo').value || 'casa',
        provincia: document.getElementById('dProvincia').value.trim(),
        canton: document.getElementById('dCanton').value.trim(),
        distrito: document.getElementById('dDistrito').value.trim(),
        codigoPostal: document.getElementById('dCodigoPostal').value.trim(),
        direccionExacta: document.getElementById('dDireccionExacta').value.trim(),
        esPrincipal: existentes.length === 0
    };

    const direcciones = [...existentes, nueva];

    try {
        const res = await apiFetch('/auth/perfil', {
            method: 'PUT',
            body: JSON.stringify({ direcciones })
        });

        perfilActual = res.datos;
        actualizarUsuarioLocal(perfilActual);
        renderizarDirecciones(perfilActual.direcciones || []);
        evento.target.reset();
        mostrarAlerta('Dirección guardada');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function hacerDireccionPrincipal(indice) {
    const direcciones = (perfilActual.direcciones || []).map((dir, i) => ({
        ...dir,
        esPrincipal: i === indice
    }));

    try {
        const res = await apiFetch('/auth/perfil', {
            method: 'PUT',
            body: JSON.stringify({ direcciones })
        });

        perfilActual = res.datos;
        actualizarUsuarioLocal(perfilActual);
        renderizarDirecciones(perfilActual.direcciones || []);
        mostrarAlerta('Dirección principal actualizada');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function eliminarDireccion(indice) {
    const confirmado = await confirmarAccion({
        titulo: 'Eliminar dirección',
        mensaje: '¿Deseás eliminar esta dirección guardada?',
        textoConfirmar: 'Eliminar'
    });
    if (!confirmado) return;

    const existentes = perfilActual.direcciones || [];
    const eraPrincipal = Boolean(existentes[indice] && existentes[indice].esPrincipal);
    const direcciones = existentes.filter((_, i) => i !== indice).map((d, i) => ({
        ...d,
        esPrincipal: eraPrincipal ? i === 0 : Boolean(d.esPrincipal)
    }));

    try {
        const res = await apiFetch('/auth/perfil', {
            method: 'PUT',
            body: JSON.stringify({ direcciones })
        });

        perfilActual = res.datos;
        actualizarUsuarioLocal(perfilActual);
        renderizarDirecciones(perfilActual.direcciones || []);
        mostrarAlerta('Dirección eliminada');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function cambiarContrasenna(evento) {
    evento.preventDefault();

    const contrasennaActual = document.getElementById('claveActual').value;
    const contrasennaNueva = document.getElementById('claveNueva').value;
    const confirmar = document.getElementById('claveConfirmar').value;

    if (contrasennaNueva !== confirmar) {
        mostrarAlerta('La confirmación de la nueva contraseña no coincide', 'warning');
        return;
    }

    try {
        await apiFetch('/auth/contrasenna', {
            method: 'PUT',
            body: JSON.stringify({ contrasennaActual, contrasennaNueva })
        });

        evento.target.reset();
        mostrarAlerta('Contraseña actualizada correctamente');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
