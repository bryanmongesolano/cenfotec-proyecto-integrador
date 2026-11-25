let usuarios = [];
let modal = null;
let modalDetalle = null;
let paginaActual = 1;
const POR_PAGINA = 10;

if (requerirAdmin()) {
    modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
    modalDetalle = new bootstrap.Modal(document.getElementById('modalDetalleUsuario'));
    cargar();

    document.getElementById('btnNuevo').addEventListener('click', abrirNuevo);
    document.getElementById('formUsuario').addEventListener('submit', guardar);
    document.getElementById('buscar').addEventListener('input', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroRol').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroEstado').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('tabla').addEventListener('click', manejarAccion);
}

async function cargar() {
    try {
        usuarios = await apiFetch('/usuarios');
        pintarKPIs();
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintarKPIs() {
    const total = usuarios.length;
    const clientes = usuarios.filter(u => u.rol === 'cliente').length;
    const admins = usuarios.filter(u => u.rol === 'admin').length;
    const inactivos = usuarios.filter(u => !u.estado).length;

    document.getElementById('kpiTotalUsr').textContent = String(total);
    document.getElementById('kpiClientesUsr').textContent = String(clientes);
    document.getElementById('kpiAdminsUsr').textContent = String(admins);
    document.getElementById('kpiInactivosUsr').textContent = String(inactivos);
}

function obtenerFiltrados() {
    const texto = document.getElementById('buscar').value.toLowerCase().trim();
    const rol = document.getElementById('filtroRol').value;
    const estado = document.getElementById('filtroEstado').value;

    return usuarios.filter(u => {
        const completo = `${u.nombre || ''} ${u.apellido || ''} ${u.apellido2 || ''}`.toLowerCase();
        const coincide = !texto ||
            completo.includes(texto) ||
            (u.correo || '').toLowerCase().includes(texto) ||
            (u.cedula || '').toLowerCase().includes(texto) ||
            (u.telefono || '').toLowerCase().includes(texto);
        const rolOk = !rol || u.rol === rol;
        const estadoOk = estado === '' || String(u.estado) === estado;
        return coincide && rolOk && estadoOk;
    });
}

function pintar() {
    const lista = obtenerFiltrados();
    const tabla = document.getElementById('tabla');
    const paginado = paginarLista(lista, paginaActual, POR_PAGINA);
    paginaActual = paginado.pagina;
    const paginaItems = paginado.items;

    if (!paginaItems.length) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Sin usuarios</td></tr>';
        renderizarPaginacion('paginacionUsuarios', 0, 1, POR_PAGINA, () => {});
        return;
    }

    tabla.innerHTML = paginaItems.map(u => {
        const nombreCompleto = [u.nombre, u.apellido, u.apellido2].filter(Boolean).join(' ');
        const rolBadge = u.rol === 'admin'
            ? '<span class="badge rounded-pill bg-dark"><i class="bi bi-shield-lock me-1"></i>Admin</span>'
            : '<span class="badge rounded-pill bg-light text-dark border">Cliente</span>';

        return `
            <tr>
                <td>${esc(nombreCompleto)}</td>
                <td>
                    <div>${esc(u.correo)}</div>
                    <div class="text-muted">${esc(u.telefono || 'Sin teléfono')}</div>
                </td>
                <td>${esc(u.cedula || '—')}</td>
                <td>${rolBadge}</td>
                <td>
                    <button type="button" class="btn btn-sm p-0 border-0 bg-transparent" data-accion="toggleEstado" data-id="${u._id}" title="Cambiar estado">
                        ${badgeActivo(u.estado)}
                    </button>
                </td>
                <td class="text-end text-nowrap">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" data-accion="ver" data-id="${u._id}" title="Ver ficha e historial"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-outline-primary" data-accion="editar" data-id="${u._id}" title="Editar"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-outline-danger" data-accion="eliminar" data-id="${u._id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    renderizarPaginacion('paginacionUsuarios', lista.length, paginaActual, POR_PAGINA, (nueva) => {
        paginaActual = nueva;
        pintar();
    });
}

async function manejarAccion(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;

    const id = boton.dataset.id;
    const accion = boton.dataset.accion;

    if (accion === 'ver') await verDetalleUsuario(id);
    else if (accion === 'editar') abrirEditar(id);
    else if (accion === 'toggleEstado') await alternarEstado(id);
    else if (accion === 'eliminar') await eliminar(id);
}

async function verDetalleUsuario(id) {
    const u = usuarios.find(x => x._id === id);
    if (!u) return;

    document.getElementById('tituloDetalleUsuario').textContent = `${u.nombre} ${u.apellido}`;
    const cuerpo = document.getElementById('cuerpoDetalleUsuario');
    cuerpo.innerHTML = '<div class="text-center py-4 text-muted small">Cargando historial...</div>';
    modalDetalle.show();

    let pedidosUsuario = [];
    try {
        pedidosUsuario = await apiFetch('/pedidos?usuario=' + u._id, { silencioso: true });
    } catch (error) {
        pedidosUsuario = [];
    }

    const totalGastado = pedidosUsuario
        .filter(p => p.estado !== 'cancelado')
        .reduce((acc, p) => acc + (Number(p.total) || 0), 0);

    const direccionesHtml = (u.direcciones && u.direcciones.length)
        ? u.direcciones.map(d => `
            <div class="border rounded-3 p-2 small mb-2">
                <span class="fw-semibold text-capitalize">${esc(d.tipo || 'casa')}</span>
                ${d.esPrincipal ? '<span class="badge bg-primary-subtle text-primary ms-1">Principal</span>' : ''}
                <div class="text-muted">${esc([d.provincia, d.canton, d.distrito, d.direccionExacta].filter(Boolean).join(', '))}</div>
            </div>`).join('')
        : '<p class="text-muted small mb-0">Sin direcciones registradas.</p>';

    const pedidosHtml = pedidosUsuario.length
        ? `<div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
                <thead class="table-light">
                    <tr><th>Orden</th><th>Fecha</th><th class="text-end">Total</th><th>Estado</th></tr>
                </thead>
                <tbody>
                    ${pedidosUsuario.slice(0, 8).map(p => `
                        <tr>
                            <td>${esc(p.numero)}</td>
                            <td class="text-muted">${fechaCorta(p.fecha)}</td>
                            <td class="text-end tabular-nums">${moneda(p.total)}</td>
                            <td>${badgePedido(p.estado)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
           </div>`
        : '<p class="text-muted small mb-0">Este usuario aún no ha realizado pedidos.</p>';

    cuerpo.innerHTML = `
        <div class="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
            <span class="rounded-circle bg-primary text-white fw-bold d-inline-flex align-items-center justify-content-center flex-shrink-0 fs-5" style="width: 52px; height: 52px;">${esc(inicialesUsuario(u.nombre, u.apellido))}</span>
            <div class="flex-grow-1">
                <h6 class="fw-bold mb-1">${esc([u.nombre, u.apellido, u.apellido2].filter(Boolean).join(' '))}</h6>
                <div class="text-muted small">${esc(u.correo)} · ${esc(u.telefono || 'Sin teléfono')} · Cédula: ${esc(u.cedula || '—')}</div>
            </div>
            <div class="text-end">
                <div class="small text-muted">Total compras</div>
                <div class="fs-5 fw-bold text-primary tabular-nums">${moneda(totalGastado)}</div>
            </div>
        </div>
        <div class="row g-4">
            <div class="col-md-5">
                <h6 class="fw-bold small text-uppercase text-muted mb-2">Direcciones (${(u.direcciones || []).length})</h6>
                ${direccionesHtml}
            </div>
            <div class="col-md-7">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="fw-bold small text-uppercase text-muted mb-0">Últimos pedidos (${pedidosUsuario.length})</h6>
                    <a href="pedidos.html?q=${encodeURIComponent((u.nombre + ' ' + u.apellido).trim())}" class="btn btn-sm btn-outline-primary">Ver todos</a>
                </div>
                ${pedidosHtml}
            </div>
        </div>`;
}

async function alternarEstado(id) {
    const actual = obtenerUsuario();
    if (actual && actual._id === id) {
        mostrarAlerta('No podés desactivar tu propia cuenta', 'warning');
        return;
    }

    const u = usuarios.find(x => x._id === id);
    if (!u) return;

    try {
        await apiFetch('/usuarios/' + id, {
            method: 'PUT',
            body: JSON.stringify({ estado: !u.estado })
        });
        mostrarAlerta(`Usuario ${!u.estado ? 'activado' : 'desactivado'}`);
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function abrirNuevo() {
    document.getElementById('formUsuario').reset();
    document.getElementById('id').value = '';
    document.getElementById('tituloModal').textContent = 'Nuevo usuario';
    document.getElementById('correo').disabled = false;
    document.getElementById('contrasenna').required = true;
    document.getElementById('ayudaContrasenna').textContent = '(obligatoria, mín. 6 caracteres)';
    document.getElementById('rol').value = 'cliente';
    document.getElementById('estado').value = 'true';
    modal.show();
}

function abrirEditar(id) {
    const usuario = usuarios.find(u => u._id === id);
    if (!usuario) return;

    document.getElementById('id').value = usuario._id;
    document.getElementById('tituloModal').textContent = 'Editar usuario';
    document.getElementById('nombre').value = usuario.nombre || '';
    document.getElementById('apellido').value = usuario.apellido || '';
    document.getElementById('apellido2').value = usuario.apellido2 || '';
    document.getElementById('cedula').value = usuario.cedula || '';
    document.getElementById('correo').value = usuario.correo || '';
    document.getElementById('correo').disabled = false;
    document.getElementById('telefono').value = usuario.telefono || '';
    document.getElementById('contrasenna').value = '';
    document.getElementById('contrasenna').required = false;
    document.getElementById('ayudaContrasenna').textContent = '(dejar vacío para no cambiar)';
    document.getElementById('rol').value = usuario.rol;
    document.getElementById('estado').value = String(usuario.estado);

    modal.show();
}

async function guardar(evento) {
    evento.preventDefault();

    const id = document.getElementById('id').value;
    const cedula = document.getElementById('cedula').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const contrasenna = document.getElementById('contrasenna').value;

    const cuerpo = {
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellido').value.trim(),
        apellido2: document.getElementById('apellido2').value.trim(),
        correo: document.getElementById('correo').value.trim(),
        rol: document.getElementById('rol').value,
        estado: document.getElementById('estado').value === 'true'
    };

    if (cedula || id) cuerpo.cedula = cedula;
    if (telefono || id) cuerpo.telefono = telefono;
    if (contrasenna) cuerpo.contrasenna = contrasenna;

    try {
        if (id) {
            await apiFetch('/usuarios/' + id, { method: 'PUT', body: JSON.stringify(cuerpo) });
            mostrarAlerta('Usuario actualizado');
        } else {
            await apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(cuerpo) });
            mostrarAlerta('Usuario creado');
        }

        modal.hide();
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function eliminar(id) {
    const actual = obtenerUsuario();

    if (actual && actual._id === id) {
        mostrarAlerta('No podés eliminar tu propio usuario', 'warning');
        return;
    }

    const usuario = usuarios.find(u => u._id === id);
    const confirmado = await confirmarAccion({
        titulo: 'Eliminar usuario',
        mensaje: `¿Seguro que deseás eliminar a ${usuario ? usuario.nombre + ' ' + usuario.apellido : 'este usuario'}?`,
        textoConfirmar: 'Eliminar'
    });
    if (!confirmado) return;

    try {
        await apiFetch('/usuarios/' + id, { method: 'DELETE' });
        mostrarAlerta('Usuario eliminado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
