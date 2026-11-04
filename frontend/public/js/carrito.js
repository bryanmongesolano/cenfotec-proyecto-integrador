let carrito = null;
let usuario = null;

if (requerirUsuario()) {
    usuario = obtenerUsuario();
    cargar();
}

async function cargar() {
    try {
        carrito = await apiFetch('/carrito/' + usuario._id);
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintar() {
    const contenido = document.getElementById('contenido');

    if (!carrito.items.length) {
        contenido.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body text-center py-5">
                    <p class="text-muted mb-3">Tu carrito está vacío.</p>
                    <a href="tienda.html" class="btn btn-primary">Ir a la tienda</a>
                </div>
            </div>`;
        return;
    }

    contenido.innerHTML = `
        <div class="row g-4">
            <div class="col-12 col-lg-8">
                <div class="card shadow-sm">
                    <div class="table-responsive">
                        <table class="table table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th class="text-end">Precio</th>
                                    <th class="text-center">Cantidad</th>
                                    <th class="text-end">Subtotal</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${carrito.items.map(item => {
        const p = item.producto || {};
        const imagen = p.imagenes && p.imagenes.length ? p.imagenes[0] : 'img/placeholder.svg';

        return `
                                        <tr>
                                            <td>
                                                <div class="d-flex align-items-center gap-2">
                                                    <img src="${esc(imagen)}" class="thumb" alt="${esc(p.nombre || 'Producto')}" />
                                                    <span>${esc(p.nombre || 'Producto no disponible')}</span>
                                                </div>
                                            </td>
                                            <td class="text-end">${moneda(item.precioUnitario)}</td>
                                            <td class="text-center" style="width: 110px;">
                                                <input type="number" class="form-control form-control-sm" value="${item.cantidad}" min="1" data-cantidad="${item._id}" />
                                            </td>
                                            <td class="text-end">${moneda(item.precioUnitario * item.cantidad)}</td>
                                            <td class="text-end">
                                                <button class="btn btn-sm btn-outline-danger" data-quitar="${item._id}">Quitar</button>
                                            </td>
                                        </tr>`;
    }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-4">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h2 class="h5">Resumen</h2>
                        <div class="d-flex justify-content-between"><span>Subtotal</span><span>${moneda(carrito.subtotal)}</span></div>
                        <div class="d-flex justify-content-between"><span>Impuestos</span><span>${moneda(carrito.impuestos)}</span></div>
                        <hr />
                        <div class="d-flex justify-content-between fw-bold"><span>Total</span><span>${moneda(carrito.total)}</span></div>
                        <a href="checkout.html" class="btn btn-primary w-100 mt-3">Ir a pagar</a>
                        <button class="btn btn-outline-danger w-100 mt-2" id="vaciar">Vaciar carrito</button>
                    </div>
                </div>
            </div>
        </div>`;

    contenido.querySelectorAll('input[data-cantidad]').forEach(input => {
        input.addEventListener('change', cambiarCantidad);
    });

    contenido.querySelectorAll('button[data-quitar]').forEach(boton => {
        boton.addEventListener('click', quitar);
    });

    const vaciar = document.getElementById('vaciar');
    if (vaciar) vaciar.addEventListener('click', vaciarCarrito);
}

async function cambiarCantidad(evento) {
    const itemId = evento.target.dataset.cantidad;
    const cantidad = Number(evento.target.value);

    if (!Number.isInteger(cantidad) || cantidad < 1) {
        mostrarAlerta('La cantidad debe ser mayor o igual a 1', 'warning');
        cargar();
        return;
    }

    try {
        await apiFetch('/carrito/' + usuario._id + '/items/' + itemId, {
            method: 'PUT',
            body: JSON.stringify({ cantidad })
        });

        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
        cargar();
    }
}

async function quitar(evento) {
    const itemId = evento.target.dataset.quitar;

    try {
        await apiFetch('/carrito/' + usuario._id + '/items/' + itemId, { method: 'DELETE' });
        mostrarAlerta('Producto quitado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function vaciarCarrito() {
    if (!confirm('¿Vaciar el carrito?')) return;

    try {
        await apiFetch('/carrito/' + usuario._id, { method: 'DELETE' });
        mostrarAlerta('Carrito vaciado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
