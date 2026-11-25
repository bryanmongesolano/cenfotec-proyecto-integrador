const IMG_FALLBACK = "onerror=\"this.onerror=null;this.src='img/placeholder.svg';\"";
const IVA = 0.13;
const META_ENVIO_GRATIS = 50000;

let carrito = null;
let usuario = null;
let modoInvitado = false;

iniciar();

function iniciar() {
    const u = obtenerUsuario();
    if (obtenerToken() && u) {
        usuario = u;
        modoInvitado = false;
    } else {
        usuario = null;
        modoInvitado = true;
    }
    cargar();
}

async function cargar() {
    try {
        if (modoInvitado) {
            carrito = await construirCarritoInvitado();
            if (typeof actualizarBadgeCarrito === 'function') {
                actualizarBadgeCarrito();
            }
        } else {
            carrito = await apiFetch('/carrito/' + usuario._id);
            if (typeof actualizarBadgeCarrito === 'function') {
                actualizarBadgeCarrito(carrito);
            }
        }
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function construirCarritoInvitado() {
    const guardados = obtenerCarritoInvitado();
    if (!guardados.length) {
        return { items: [], subtotal: 0, impuestos: 0, total: 0 };
    }

    const listaProductos = await apiPublica('/productos').catch(() => []);
    const mapa = new Map((listaProductos || []).map(p => [p._id, p]));

    const items = guardados.map(g => {
        const prod = mapa.get(g.productoId) || null;
        return {
            _id: g.productoId,
            producto: prod,
            cantidad: g.cantidad,
            precioUnitario: prod ? Number(prod.precio) || 0 : 0
        };
    });

    const subtotal = items.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);
    const impuestos = Math.round(subtotal * IVA * 100) / 100;
    const total = subtotal + impuestos;

    return { items, subtotal, impuestos, total };
}

function analizarItem(item) {
    const p = item.producto;
    const eliminado = !p || !p._id;
    const inactivo = !eliminado && p.estado === false;
    const tieneStockNum = !eliminado && typeof p.stock === 'number';
    const sinStock = tieneStockNum && p.stock <= 0;
    const excedeStock = tieneStockNum && !sinStock && item.cantidad > p.stock;
    const tieneProblema = eliminado || inactivo || sinStock || excedeStock;

    return { p: p || {}, eliminado, inactivo, tieneStockNum, sinStock, excedeStock, tieneProblema };
}

function pintar() {
    const contenido = document.getElementById('contenido');

    if (!carrito || !carrito.items.length) {
        contenido.innerHTML = `
            <div class="card border-0 shadow-sm">
                <div class="card-body text-center py-5">
                    <i class="bi bi-cart fs-1 text-muted d-block mb-2" aria-hidden="true"></i>
                    <h2 class="h5 fw-bold mb-1">Tu carrito está vacío</h2>
                    <p class="text-muted small mb-4">Explorá nuestro catálogo y agregá tus productos favoritos.</p>
                    <a href="tienda.html" class="btn btn-primary rounded-pill px-4">Explorar tienda</a>
                </div>
            </div>`;
        return;
    }

    let hayProblemas = false;
    const totalArticulos = carrito.items.reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0);
    const faltante = Math.max(0, META_ENVIO_GRATIS - (carrito.subtotal || 0));
    const pctEnvio = Math.min(100, Math.round(((carrito.subtotal || 0) / META_ENVIO_GRATIS) * 100));

    const filasHtml = carrito.items.map(item => {
        const info = analizarItem(item);
        if (info.tieneProblema) hayProblemas = true;

        const p = info.p;
        const imagen = p.imagenes && p.imagenes.length ? p.imagenes[0] : 'img/placeholder.svg';
        const bloquearControles = info.eliminado || info.inactivo || info.sinStock;
        const bloquearMas = bloquearControles || (info.tieneStockNum && item.cantidad >= p.stock);
        const bloquearMenos = bloquearControles || item.cantidad <= 1;

        let avisoEstado = '';
        if (info.eliminado) {
            avisoEstado = '<span class="badge bg-danger mt-1">Producto eliminado</span>';
        } else if (info.inactivo) {
            avisoEstado = '<span class="badge bg-danger mt-1">No disponible</span>';
        } else if (info.sinStock) {
            avisoEstado = '<span class="badge bg-secondary mt-1">Agotado</span>';
        } else if (info.excedeStock) {
            avisoEstado = `<span class="badge bg-warning text-dark mt-1">Solo quedan ${p.stock} disponible(s)</span>`;
        } else if (info.tieneStockNum) {
            avisoEstado = `<div class="small text-muted">Stock disponible: ${p.stock}</div>`;
        }

        const tituloProducto = info.eliminado
            ? '<span class="text-muted fw-medium">Producto ya no disponible</span>'
            : `<a href="producto.html?id=${p._id}" class="text-decoration-none text-dark fw-semibold">${esc(p.nombre)}</a>`;

        return `
            <tr class="${info.tieneProblema ? 'table-warning' : ''}">
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <img src="${esc(imagen)}" ${IMG_FALLBACK} class="thumb rounded border" alt="${esc(p.nombre || 'Producto')}" />
                        <div>
                            ${tituloProducto}
                            <div>${avisoEstado}</div>
                        </div>
                    </div>
                </td>
                <td class="text-end tabular-nums">${moneda(item.precioUnitario)}</td>
                <td class="text-center" style="width: 145px;">
                    <div class="input-group input-group-sm">
                        <button type="button" class="btn btn-outline-secondary" data-step="-1" data-item="${item._id}" aria-label="Disminuir cantidad" ${bloquearMenos ? 'disabled' : ''}>−</button>
                        <input
                            type="number"
                            class="form-control text-center"
                            value="${item.cantidad}"
                            min="1"
                            ${info.tieneStockNum ? `max="${p.stock}"` : ''}
                            data-cantidad="${item._id}"
                            aria-label="Cantidad"
                            ${bloquearControles ? 'disabled' : ''}
                        />
                        <button type="button" class="btn btn-outline-secondary" data-step="1" data-item="${item._id}" aria-label="Aumentar cantidad" ${bloquearMas ? 'disabled' : ''}>+</button>
                    </div>
                </td>
                <td class="text-end fw-bold text-primary tabular-nums">${moneda(item.precioUnitario * item.cantidad)}</td>
                <td class="text-end">
                    <button type="button" class="btn btn-sm btn-outline-danger" data-quitar="${item._id}" title="Quitar" aria-label="Quitar ${esc(p.nombre || 'producto')}">
                        <i class="bi bi-trash" aria-hidden="true"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');

    const alertaProblemas = hayProblemas ? `
        <div class="alert alert-warning small d-flex align-items-center gap-2 mb-3">
            <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
            <span>Algunos productos de tu carrito ya no están disponibles o superan el stock actual. Ajustá las cantidades o quitalos para continuar.</span>
        </div>` : '';

    const urlCheckout = modoInvitado ? 'login.html?next=checkout.html' : 'checkout.html';
    const textoCheckout = modoInvitado ? 'Iniciar sesión y pagar' : 'Continuar al checkout';

    contenido.innerHTML = `
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body py-3">
                <div class="d-flex justify-content-between align-items-center small mb-2">
                    <span class="fw-semibold">
                        ${faltante === 0
                            ? '<i class="bi bi-check-circle-fill text-success me-1"></i>¡Alcanzaste envío estándar GRATIS en tu pedido!'
                            : `<i class="bi bi-truck text-primary me-1"></i>Te faltan <strong>${moneda(faltante)}</strong> para obtener envío estándar gratis`}
                    </span>
                    <span class="text-muted">${pctEnvio}%</span>
                </div>
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar ${faltante === 0 ? 'bg-success' : 'bg-primary'}" style="width: ${pctEnvio}%"></div>
                </div>
            </div>
        </div>
        ${alertaProblemas}
        <div class="row g-4">
            <div class="col-12 col-lg-8">
                <div class="card border-0 shadow-sm">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Producto</th>
                                    <th class="text-end">Precio</th>
                                    <th class="text-center">Cantidad</th>
                                    <th class="text-end">Subtotal</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>${filasHtml}</tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-body p-4">
                        <h2 class="h5 fw-bold mb-3">Resumen (${totalArticulos} artículo${totalArticulos === 1 ? '' : 's'})</h2>
                        <div class="d-flex justify-content-between mb-2">
                            <span class="text-muted">Subtotal</span>
                            <span class="tabular-nums">${moneda(carrito.subtotal)}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span class="text-muted">Impuestos (IVA 13%)</span>
                            <span class="tabular-nums">${moneda(carrito.impuestos)}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2 small">
                            <span class="text-muted">Envío estándar</span>
                            <span class="${faltante === 0 ? 'text-success fw-semibold' : 'text-muted'}">${faltante === 0 ? 'Gratis' : 'Se calcula al pagar'}</span>
                        </div>
                        <hr />
                        <div class="d-flex justify-content-between fs-5 fw-bold mb-3">
                            <span>Total estimado</span>
                            <span class="text-primary tabular-nums">${moneda(carrito.total)}</span>
                        </div>
                        ${hayProblemas
            ? '<button type="button" class="btn btn-primary w-100" disabled>Revisá los productos para pagar</button>'
            : `<a href="${urlCheckout}" class="btn btn-primary w-100 fw-semibold">${textoCheckout}</a>`}
                        ${modoInvitado && !hayProblemas ? '<p class="small text-muted text-center mt-2 mb-0">Tus productos se guardarán al iniciar sesión.</p>' : ''}
                    </div>
                </div>
            </div>
        </div>`;

    contenido.querySelectorAll('input[data-cantidad]').forEach(input => {
        input.addEventListener('change', (ev) => actualizarCantidadItem(ev.target.dataset.cantidad, Number(ev.target.value)));
    });

    contenido.querySelectorAll('button[data-step]').forEach(boton => {
        boton.addEventListener('click', () => {
            const itemId = boton.dataset.item;
            const delta = Number(boton.dataset.step);
            const item = carrito.items.find(i => i._id === itemId);
            if (!item) return;
            actualizarCantidadItem(itemId, item.cantidad + delta);
        });
    });

    contenido.querySelectorAll('button[data-quitar]').forEach(boton => {
        boton.addEventListener('click', quitar);
    });
}

async function actualizarCantidadItem(itemId, cantidad) {
    if (!Number.isInteger(cantidad) || cantidad < 1) {
        mostrarAlerta('La cantidad debe ser mayor o igual a 1', 'warning');
        pintar();
        return;
    }

    if (modoInvitado) {
        const item = carrito.items.find(i => i._id === itemId);
        if (item && item.producto && typeof item.producto.stock === 'number' && cantidad > item.producto.stock) {
            mostrarAlerta(`Stock insuficiente (disponible: ${item.producto.stock})`, 'warning');
            pintar();
            return;
        }
        actualizarCarritoInvitado(itemId, cantidad);
        await cargar();
        return;
    }

    try {
        const res = await apiFetch('/carrito/' + usuario._id + '/items/' + itemId, {
            method: 'PUT',
            body: JSON.stringify({ cantidad })
        });

        carrito = res.datos;
        if (typeof actualizarBadgeCarrito === 'function') {
            actualizarBadgeCarrito(carrito);
        }
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
        cargar();
    }
}

async function quitar(evento) {
    const boton = evento.target.closest('button[data-quitar]');
    if (!boton) return;

    const itemId = boton.dataset.quitar;

    if (modoInvitado) {
        quitarCarritoInvitado(itemId);
        mostrarAlerta('Producto quitado');
        await cargar();
        return;
    }

    try {
        const res = await apiFetch('/carrito/' + usuario._id + '/items/' + itemId, { method: 'DELETE' });
        carrito = res.datos;
        if (typeof actualizarBadgeCarrito === 'function') {
            actualizarBadgeCarrito(carrito);
        }
        mostrarAlerta('Producto quitado');
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
