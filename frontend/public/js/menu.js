const ADMIN_SECCIONES = [
    {
        titulo: 'General',
        enlaces: [
            { href: 'dashboard.html', texto: 'Dashboard', icono: 'speedometer2' }
        ]
    },
    {
        titulo: 'Catálogo',
        enlaces: [
            { href: 'productos.html', texto: 'Productos', icono: 'box-seam' },
            { href: 'categorias.html', texto: 'Categorías', icono: 'tags' }
        ]
    },
    {
        titulo: 'Operaciones',
        enlaces: [
            { href: 'pedidos.html', texto: 'Pedidos', icono: 'bag-check' },
            { href: 'pagos.html', texto: 'Pagos', icono: 'credit-card' },
            { href: 'cupones.html', texto: 'Cupones', icono: 'ticket-perforated' }
        ]
    },
    {
        titulo: 'Comunidad',
        enlaces: [
            { href: 'usuarios.html', texto: 'Usuarios', icono: 'people' },
            { href: 'resennas.html', texto: 'Reseñas', icono: 'star-half' }
        ]
    }
];

function construirNavegacionSidebar(pagina) {
    return ADMIN_SECCIONES.map(sec => `
        <div class="text-uppercase fw-semibold text-secondary px-2 pt-3 pb-1" style="font-size: 0.7rem; letter-spacing: 0.06em;">${sec.titulo}</div>
        <ul class="nav nav-pills flex-column gap-1">
            ${sec.enlaces.map(item => `
                <li class="nav-item">
                    <a class="nav-link d-flex align-items-center gap-2 py-2 ${pagina === item.href ? 'active text-white' : 'text-white-50'}" href="${item.href}">
                        <i class="bi bi-${item.icono}" aria-hidden="true"></i>
                        <span class="flex-grow-1">${item.texto}</span>
                    </a>
                </li>`).join('')}
        </ul>`).join('');
}

document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('adminSidebar');
    const topbar = document.getElementById('adminTopbar');
    const usuario = obtenerUsuario();
    const pagina = location.pathname.split('/').pop() || 'dashboard.html';
    const iniciales = usuario ? inicialesUsuario(usuario.nombre, usuario.apellido) : 'AD';
    const nombreCompleto = usuario ? `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() : 'Administrador';

    if (sidebar) {
        sidebar.className = 'offcanvas-lg offcanvas-start text-bg-dark flex-shrink-0 d-flex flex-column admin-sidebar-lg';
        sidebar.tabIndex = -1;
        sidebar.innerHTML = `
            <div class="d-flex align-items-center justify-content-between px-3 py-3 border-bottom border-secondary border-opacity-25">
                <a class="d-flex align-items-center gap-2 text-white text-decoration-none" href="dashboard.html">
                    <span class="rounded-3 bg-primary text-white d-inline-flex align-items-center justify-content-center" style="width: 34px; height: 34px;">
                        <i class="bi bi-shop-window" aria-hidden="true"></i>
                    </span>
                    <span class="fw-bold">Mundo Trendy</span>
                </a>
                <button type="button" class="btn-close btn-close-white d-lg-none" data-bs-dismiss="offcanvas" data-bs-target="#adminSidebar" aria-label="Cerrar"></button>
            </div>
            <div class="offcanvas-body d-flex flex-column p-0 overflow-y-auto">
                <nav class="flex-grow-1 px-3 pb-3" aria-label="Navegación administrativa">
                    ${construirNavegacionSidebar(pagina)}
                </nav>
                <div class="p-3 border-top border-secondary border-opacity-25 d-grid gap-2">
                    <a href="tienda.html" class="btn btn-outline-light btn-sm d-flex align-items-center justify-content-center gap-2">
                        <i class="bi bi-shop"></i><span>Tienda</span>
                    </a>
                    <div class="dropup">
                        <button class="btn btn-light btn-sm w-100 d-flex align-items-center justify-content-between gap-2 dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="d-flex align-items-center gap-2 min-w-0">
                                <span class="rounded-circle bg-primary text-white fw-bold d-inline-flex align-items-center justify-content-center flex-shrink-0" style="width: 24px; height: 24px; font-size: 0.7rem;">${esc(iniciales)}</span>
                                <span class="fw-medium text-truncate">${esc(usuario ? usuario.nombre : 'Admin')}</span>
                            </span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow border-0 w-100">
                            <li class="px-3 py-2 border-bottom">
                                <div class="fw-semibold small text-truncate">${esc(nombreCompleto)}</div>
                                <div class="text-muted text-truncate" style="font-size: 0.75rem;">${esc(usuario ? usuario.correo : '')}</div>
                            </li>
                            <li><a class="dropdown-item" href="perfil.html"><i class="bi bi-person me-2"></i>Mi cuenta</a></li>
                            <li><a class="dropdown-item" href="tienda.html"><i class="bi bi-shop me-2"></i>Ver tienda</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><button type="button" class="dropdown-item text-danger" onclick="cerrarSesion()"><i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión</button></li>
                        </ul>
                    </div>
                </div>
            </div>`;
    }

    if (topbar) {
        topbar.className = 'navbar bg-white border-bottom sticky-top px-3 py-2 d-lg-none';
        topbar.innerHTML = `
            <div class="container-fluid px-0 d-flex justify-content-start align-items-center gap-2">
                <button class="btn btn-light border btn-sm" type="button" data-bs-toggle="offcanvas" data-bs-target="#adminSidebar" aria-controls="adminSidebar" aria-label="Abrir menú">
                    <i class="bi bi-list fs-5"></i>
                </button>
                <span class="fw-bold">Mundo Trendy</span>
            </div>`;
    }
});
