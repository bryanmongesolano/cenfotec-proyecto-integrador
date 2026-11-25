const MINI_IMG_FALLBACK = "onerror=\"this.onerror=null;this.src='img/placeholder.svg';\"";

function actualizarBadgesVisuales(totalItems) {
    document.querySelectorAll('.badge-carrito').forEach(badge => {
        badge.textContent = String(totalItems);
        badge.classList.toggle('d-none', totalItems === 0);
    });
}

function pintarZonaSesionNavbar(usuario) {
    const zona = document.getElementById('zonaSesionNav');
    if (!zona) return;

    if (usuario) {
        const iniciales = inicialesUsuario(usuario.nombre, usuario.apellido);

        zona.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-light border btn-sm rounded-pill d-inline-flex align-items-center gap-2 dropdown-toggle px-2 pe-3" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <span class="rounded-circle bg-primary text-white fw-bold d-inline-flex align-items-center justify-content-center" style="width: 24px; height: 24px; font-size: 0.7rem;">${esc(iniciales)}</span>
                    <span id="nombreUsuarioNav" class="fw-semibold">${esc(usuario.nombre)}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
                    <li class="px-3 py-2 border-bottom">
                        <div class="fw-semibold small">${esc(usuario.nombre + ' ' + (usuario.apellido || ''))}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${esc(usuario.correo || '')}</div>
                    </li>
                    <li><a class="dropdown-item" href="perfil.html"><i class="bi bi-person me-2"></i>Mi perfil</a></li>
                    ${usuario.rol === 'admin' ? '<li><a class="dropdown-item fw-semibold text-primary" href="dashboard.html"><i class="bi bi-speedometer2 me-2"></i>Panel admin</a></li>' : ''}
                    <li><hr class="dropdown-divider"></li>
                    <li><button type="button" class="dropdown-item text-danger" onclick="cerrarSesion()"><i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión</button></li>
                </ul>
            </div>`;
    } else {
        zona.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <a class="btn btn-outline-primary btn-sm rounded-pill px-3" href="${urlAuthConRetorno('login.html')}">Ingresar</a>
                <a class="btn btn-primary btn-sm rounded-pill px-3" href="${urlAuthConRetorno('registro.html')}">Crear cuenta</a>
            </div>`;
    }
}

async function actualizarBadgeCarrito(carritoOpcional) {
    const usuario = obtenerUsuario();
    if (!obtenerToken() || !usuario) {
        actualizarBadgesVisuales(contarItemsCarritoInvitado());
        return;
    }

    try {
        const carrito = carritoOpcional || await apiFetch('/carrito/' + usuario._id, { silencioso: true });
        const totalItems = (carrito && carrito.items ? carrito.items : [])
            .reduce((acum, item) => acum + (Number(item.cantidad) || 0), 0);
        actualizarBadgesVisuales(totalItems);
    } catch (error) {
        if (!obtenerToken()) {
            pintarZonaSesionNavbar(null);
            actualizarBadgesVisuales(contarItemsCarritoInvitado());
        } else {
            actualizarBadgesVisuales(0);
        }
    }
}

async function obtenerDatosMiniCarrito(usuario, esInvitado) {
    if (!esInvitado) {
        return apiFetch('/carrito/' + usuario._id, { silencioso: true });
    }

    const guardados = obtenerCarritoInvitado();
    if (!guardados.length) return { items: [], subtotal: 0, impuestos: 0, total: 0 };

    const prods = await apiPublica('/productos', { silencioso: true }).catch(() => []);
    const mapa = new Map((prods || []).map(p => [p._id, p]));
    const items = guardados.map(g => {
        const p = mapa.get(g.productoId) || null;
        return {
            _id: g.productoId,
            producto: p,
            cantidad: g.cantidad,
            precioUnitario: p ? Number(p.precio) || 0 : 0
        };
    });

    const subtotal = items.reduce((a, i) => a + i.precioUnitario * i.cantidad, 0);
    const impuestos = Math.round(subtotal * 0.13 * 100) / 100;
    return { items, subtotal, impuestos, total: subtotal + impuestos };
}

async function cargarMiniCarritoDrawer() {
    const body = document.getElementById('miniCarritoBody');
    const footer = document.getElementById('miniCarritoFooter');
    if (!body || !footer) return;

    body.innerHTML = '<div class="text-center py-5 text-muted small"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Cargando carrito...</div>';

    const usuario = obtenerUsuario();
    const esInvitado = !obtenerToken() || !usuario;
    let carritoData;

    try {
        carritoData = await obtenerDatosMiniCarrito(usuario, esInvitado);
    } catch (error) {
        body.innerHTML = `<div class="alert alert-danger small">${esc(error.message)}</div>`;
        footer.innerHTML = '';
        return;
    }

    const items = carritoData && carritoData.items ? carritoData.items : [];
    actualizarBadgesVisuales(items.reduce((a, i) => a + (Number(i.cantidad) || 0), 0));

    if (!items.length) {
        body.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-bag-x fs-1 text-muted d-block mb-2"></i>
                <p class="text-muted mb-3">Tu carrito está vacío</p>
                <button type="button" class="btn btn-primary btn-sm rounded-pill px-4" data-bs-dismiss="offcanvas">Explorar catálogo</button>
            </div>`;
        footer.innerHTML = '';
        return;
    }

    const faltanteEnvio = Math.max(0, 50000 - (carritoData.subtotal || 0));
    const progresoEnvio = Math.min(100, Math.round(((carritoData.subtotal || 0) / 50000) * 100));

    body.innerHTML = `
        <div class="bg-light rounded-3 p-3 mb-3 border">
            <div class="small fw-semibold mb-1">
                ${faltanteEnvio === 0
                    ? '<i class="bi bi-truck text-success me-1"></i>¡Tenés envío estándar gratis!'
                    : `<i class="bi bi-truck text-primary me-1"></i>Agregá <strong>${moneda(faltanteEnvio)}</strong> para envío estándar gratis`}
            </div>
            <div class="progress" style="height: 6px;">
                <div class="progress-bar ${faltanteEnvio === 0 ? 'bg-success' : 'bg-primary'}" style="width: ${progresoEnvio}%"></div>
            </div>
        </div>
        <div class="d-flex flex-column gap-3">
            ${items.map(item => {
                const p = item.producto || {};
                const img = p.imagenes && p.imagenes.length ? p.imagenes[0] : 'img/placeholder.svg';
                return `
                    <div class="d-flex gap-3 align-items-center pb-3 border-bottom">
                        <img src="${esc(img)}" ${MINI_IMG_FALLBACK} class="thumb rounded border flex-shrink-0" alt="${esc(p.nombre || 'Producto')}" />
                        <div class="flex-grow-1 min-w-0">
                            <a href="producto.html?id=${esc(p._id || '')}" class="text-decoration-none text-dark fw-semibold small d-block text-truncate">${esc(p.nombre || 'Producto')}</a>
                            <div class="text-muted small">${moneda(item.precioUnitario)} × ${item.cantidad}</div>
                            <div class="fw-bold text-primary small">${moneda(item.precioUnitario * item.cantidad)}</div>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger border-0" data-mini-quitar="${esc(item._id)}" aria-label="Quitar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>`;
            }).join('')}
        </div>`;

    body.querySelectorAll('button[data-mini-quitar]').forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                if (esInvitado) {
                    quitarCarritoInvitado(btn.dataset.miniQuitar);
                } else {
                    await apiFetch('/carrito/' + usuario._id + '/items/' + btn.dataset.miniQuitar, { method: 'DELETE', silencioso: true });
                }
                mostrarAlerta('Producto quitado del carrito');
                await cargarMiniCarritoDrawer();
                if (location.pathname.endsWith('carrito.html') && typeof cargar === 'function') cargar();
            } catch (error) {
                mostrarAlerta(error.message, 'danger');
            }
        });
    });

    const urlPagar = esInvitado ? 'login.html?next=checkout.html' : 'checkout.html';
    footer.innerHTML = `
        <div class="w-100">
            <div class="d-flex justify-content-between small text-muted mb-1">
                <span>Subtotal</span>
                <span>${moneda(carritoData.subtotal)}</span>
            </div>
            <div class="d-flex justify-content-between small text-muted mb-2">
                <span>IVA (13%)</span>
                <span>${moneda(carritoData.impuestos)}</span>
            </div>
            <div class="d-flex justify-content-between fw-bold fs-6 mb-3">
                <span>Total estimado</span>
                <span class="text-primary">${moneda(carritoData.total)}</span>
            </div>
            <div class="d-grid gap-2">
                <a href="${urlPagar}" class="btn btn-primary fw-semibold">${esInvitado ? 'Iniciar sesión y pagar' : 'Finalizar compra'}</a>
                <a href="carrito.html" class="btn btn-outline-secondary btn-sm">Ver carrito completo</a>
            </div>
        </div>`;
}

async function cargarCategoriasNavbar() {
    const menuCats = document.getElementById('dropdownCategoriasNav');
    if (!menuCats) return;

    try {
        const cats = await apiPublica('/categorias?estado=true', { silencioso: true });
        if (!cats || !cats.length) {
            menuCats.innerHTML = '<li><span class="dropdown-item-text text-muted small">Sin categorías</span></li>';
            return;
        }

        menuCats.innerHTML = `
            <li><a class="dropdown-item fw-semibold" href="tienda.html?ver=todos"><i class="bi bi-grid me-2 text-primary"></i>Ver todo el catálogo</a></li>
            <li><hr class="dropdown-divider"></li>
            ${cats.slice(0, 10).map(c => `
                <li><a class="dropdown-item" href="tienda.html?categoria=${encodeURIComponent(c._id)}">${esc(c.nombre)}</a></li>`).join('')}`;
    } catch (error) {
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const menu = document.getElementById('menu');
    const footer = document.querySelector('footer');
    const usuario = obtenerUsuario();
    const pagina = location.pathname.split('/').pop() || 'tienda.html';
    const qInicial = pagina === 'tienda.html' ? (new URLSearchParams(location.search).get('q') || '') : '';

    if (menu) {
        menu.innerHTML = `
            <div class="bg-dark text-light py-1 small">
                <div class="container d-flex justify-content-center align-items-center text-center">
                    <span><i class="bi bi-truck me-1"></i>Envío estándar <strong>GRATIS</strong> en compras desde ₡50 000</span>
                </div>
            </div>
            <nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top shadow-sm">
                <div class="container">
                    <a class="navbar-brand fw-bold d-flex align-items-center gap-2" href="tienda.html">
                        <span class="rounded-3 bg-primary text-white d-inline-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                            <i class="bi bi-bag-heart-fill" aria-hidden="true"></i>
                        </span>
                        <span>Mundo Trendy</span>
                    </a>

                    <div class="d-flex align-items-center gap-2 d-lg-none">
                        <button class="btn btn-light border btn-sm position-relative" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasCarrito" aria-label="Ver carrito">
                            <i class="bi bi-cart3"></i>
                            <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-primary badge-carrito d-none">0</span>
                        </button>
                        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuTienda" aria-controls="menuTienda" aria-expanded="false" aria-label="Abrir menú">
                            <span class="navbar-toggler-icon"></span>
                        </button>
                    </div>

                    <div class="collapse navbar-collapse" id="menuTienda">
                        <ul class="navbar-nav me-auto ms-lg-3 gap-lg-1">
                            <li class="nav-item">
                                <a class="nav-link fw-medium ${pagina === 'tienda.html' ? 'active text-primary fw-semibold' : ''}" href="tienda.html">Inicio</a>
                            </li>
                            <li class="nav-item dropdown">
                                <a class="nav-link fw-medium dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Categorías</a>
                                <ul class="dropdown-menu shadow border-0 mt-2" id="dropdownCategoriasNav">
                                    <li><span class="dropdown-item-text text-muted small">Cargando...</span></li>
                                </ul>
                            </li>
                        </ul>

                        <form id="formBuscarNav" class="d-flex my-2 my-lg-0 me-lg-3" role="search">
                            <div class="input-group input-group-sm">
                                <input
                                    type="search"
                                    class="form-control bg-light border-end-0"
                                    id="buscarNav"
                                    value="${esc(qInicial)}"
                                    placeholder="Buscar productos, marcas..."
                                    aria-label="Buscar productos"
                                />
                                <button class="btn btn-light border border-start-0 text-secondary" type="submit" aria-label="Buscar">
                                    <i class="bi bi-search"></i>
                                </button>
                            </div>
                        </form>

                        <div class="d-flex align-items-center gap-2 mt-2 mt-lg-0">
                            <button type="button" class="btn btn-light border btn-sm position-relative d-none d-lg-inline-flex align-items-center gap-1" data-bs-toggle="offcanvas" data-bs-target="#offcanvasCarrito" aria-label="Abrir carrito">
                                <i class="bi bi-cart3"></i>
                                <span class="badge rounded-pill text-bg-primary badge-carrito d-none">0</span>
                            </button>

                            <div id="zonaSesionNav"></div>
                        </div>
                    </div>
                </div>
            </nav>`;

        if (!document.getElementById('offcanvasCarrito')) {
            const drawer = document.createElement('div');
            drawer.className = 'offcanvas offcanvas-end';
            drawer.tabIndex = -1;
            drawer.id = 'offcanvasCarrito';
            drawer.innerHTML = `
                <div class="offcanvas-header border-bottom">
                    <h5 class="offcanvas-title fw-bold"><i class="bi bi-cart3 me-2 text-primary"></i>Tu carrito</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Cerrar"></button>
                </div>
                <div class="offcanvas-body" id="miniCarritoBody"></div>
                <div class="p-3 border-top bg-light" id="miniCarritoFooter"></div>`;
            document.body.appendChild(drawer);
            drawer.addEventListener('show.bs.offcanvas', cargarMiniCarritoDrawer);
        }

        pintarZonaSesionNavbar(usuario);

        document.getElementById('formBuscarNav').addEventListener('submit', function (evento) {
            evento.preventDefault();
            const q = document.getElementById('buscarNav').value.trim();

            if (pagina === 'tienda.html' && typeof window.aplicarBusquedaGlobal === 'function') {
                window.aplicarBusquedaGlobal(q);
                return;
            }

            location.href = q ? `tienda.html?q=${encodeURIComponent(q)}` : 'tienda.html';
        });

        actualizarBadgeCarrito();
        cargarCategoriasNavbar();
    }

    if (footer) {
        footer.className = 'bg-dark text-secondary mt-5 pt-5 pb-4';
        footer.innerHTML = `
            <div class="container">
                <div class="row g-4 pb-4 border-bottom border-secondary border-opacity-25">
                    <div class="col-12 col-lg-4">
                        <div class="d-flex align-items-center gap-2 mb-2 text-white">
                            <span class="rounded-3 bg-primary text-white d-inline-flex align-items-center justify-content-center" style="width: 30px; height: 30px;">
                                <i class="bi bi-bag-heart-fill"></i>
                            </span>
                            <span class="fw-bold fs-5">Mundo Trendy</span>
                        </div>
                        <p class="small mb-3">Tu tienda en línea de confianza en Costa Rica. Productos seleccionados, entregas rápidas y soporte dedicado.</p>
                        <div class="d-flex flex-wrap gap-2">
                            <span class="badge text-bg-light"><i class="bi bi-phone me-1"></i>SINPE Móvil</span>
                            <span class="badge text-bg-light"><i class="bi bi-credit-card me-1"></i>Tarjeta</span>
                            <span class="badge text-bg-light"><i class="bi bi-shop me-1"></i>Retiro gratis</span>
                        </div>
                    </div>
                    <div class="col-6 col-md-4 col-lg-2 offset-lg-1">
                        <h3 class="h6 text-white fw-semibold mb-3">Navegación</h3>
                        <ul class="list-unstyled small d-flex flex-column gap-2 mb-0">
                            <li><a class="link-light link-opacity-75 link-opacity-100-hover text-decoration-none" href="tienda.html">Inicio</a></li>
                            <li><a class="link-light link-opacity-75 link-opacity-100-hover text-decoration-none" href="tienda.html?ver=todos">Catálogo</a></li>
                            <li><a class="link-light link-opacity-75 link-opacity-100-hover text-decoration-none" href="carrito.html">Carrito</a></li>
                            <li><a class="link-light link-opacity-75 link-opacity-100-hover text-decoration-none" href="${usuario ? 'perfil.html' : 'login.html?next=perfil.html'}">Mi cuenta</a></li>
                        </ul>
                    </div>
                    <div class="col-6 col-md-4 col-lg-2">
                        <h3 class="h6 text-white fw-semibold mb-3">Beneficios</h3>
                        <ul class="list-unstyled small d-flex flex-column gap-2 mb-0">
                            <li>Envío gratis +₡50 000</li>
                            <li>Retiro en San José</li>
                            <li>Reseñas verificadas</li>
                            <li>Cupones de descuento</li>
                        </ul>
                    </div>
                    <div class="col-12 col-md-4 col-lg-3">
                        <h3 class="h6 text-white fw-semibold mb-3">Atención al cliente</h3>
                        <ul class="list-unstyled small d-flex flex-column gap-2 mb-0">
                            <li><i class="bi bi-geo-alt me-2"></i>San José Centro, Avenida Central</li>
                            <li><i class="bi bi-telephone me-2"></i>SINPE / WhatsApp: 8888-0000</li>
                            <li><i class="bi bi-clock me-2"></i>Lun – Sáb: 9:00 a.m. – 6:00 p.m.</li>
                        </ul>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center pt-3 small">
                    <span>&copy; ${new Date().getFullYear()} Mundo Trendy. Todos los derechos reservados.</span>
                </div>
            </div>`;
    }
});
