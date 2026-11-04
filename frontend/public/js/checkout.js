let carrito = null;
let usuario = null;

if (requerirUsuario()) {
    usuario = obtenerUsuario();
    cargar();
}

async function cargar() {
    try {
        const [datosCarrito, perfil] = await Promise.all([
            apiFetch('/carrito/' + usuario._id),
            apiFetch('/auth/perfil')
        ]);

        carrito = datosCarrito;

        if (!carrito.items.length) {
            document.getElementById('contenido').innerHTML = `
                <div class="card shadow-sm">
                    <div class="card-body text-center py-5">
                        <p class="text-muted mb-3">No hay productos en el carrito.</p>
                        <a href="tienda.html" class="btn btn-primary">Ir a la tienda</a>
                    </div>
                </div>`;
            return;
        }

        pintar(perfil);
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintar(perfil) {
    const direccion = (perfil.direcciones && perfil.direcciones[0]) || {};

    document.getElementById('contenido').innerHTML = `
        <div class="row g-4">
            <div class="col-12 col-lg-7">
                <form id="formCheckout" class="card shadow-sm">
                    <div class="card-body">
                        <h2 class="h5 mb-3">Dirección de envío</h2>

                        <div class="row g-3">
                            <div class="col-12 col-md-6">
                                <label class="form-label" for="provincia">Provincia</label>
                                <input type="text" class="form-control" id="provincia" value="${esc(direccion.provincia || '')}" required />
                            </div>
                            <div class="col-12 col-md-6">
                                <label class="form-label" for="canton">Cantón</label>
                                <input type="text" class="form-control" id="canton" value="${esc(direccion.canton || '')}" required />
                            </div>
                            <div class="col-12 col-md-6">
                                <label class="form-label" for="distrito">Distrito</label>
                                <input type="text" class="form-control" id="distrito" value="${esc(direccion.distrito || '')}" required />
                            </div>
                            <div class="col-12 col-md-6">
                                <label class="form-label" for="codigoPostal">Código postal</label>
                                <input type="text" class="form-control" id="codigoPostal" value="${esc(direccion.codigoPostal || '')}" />
                            </div>
                            <div class="col-12">
                                <label class="form-label" for="direccionExacta">Dirección exacta</label>
                                <input type="text" class="form-control" id="direccionExacta" value="${esc(direccion.direccionExacta || '')}" required />
                            </div>
                        </div>

                        <h2 class="h5 mt-4 mb-3">Pago</h2>

                        <div class="row g-3">
                            <div class="col-12 col-md-6">
                                <label class="form-label" for="metodoPago">Método de pago</label>
                                <select class="form-select" id="metodoPago">
                                    <option value="sinpe">SINPE Móvil</option>
                                    <option value="tarjeta">Tarjeta</option>
                                </select>
                            </div>
                            <div class="col-12 col-md-6">
                                <label class="form-label" for="costoEnvio">Costo de envío</label>
                                <input type="number" class="form-control" id="costoEnvio" value="1500" min="0" step="1" />
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary w-100 mt-4">Confirmar pedido</button>
                    </div>
                </form>
            </div>

            <div class="col-12 col-lg-5">
                <div class="card shadow-sm">
                    <div class="card-body">
                        <h2 class="h5 mb-3">Resumen</h2>
                        ${carrito.items.map(item => `
                            <div class="d-flex justify-content-between small mb-1">
                                <span>${esc(item.producto ? item.producto.nombre : 'Producto')} × ${item.cantidad}</span>
                                <span>${moneda(item.precioUnitario * item.cantidad)}</span>
                            </div>`).join('')}
                        <hr />
                        <div class="d-flex justify-content-between"><span>Subtotal</span><span>${moneda(carrito.subtotal)}</span></div>
                        <div class="d-flex justify-content-between"><span>Impuestos</span><span>${moneda(carrito.impuestos)}</span></div>
                        <div class="d-flex justify-content-between"><span>Envío</span><span id="envioResumen">${moneda(1500)}</span></div>
                        <hr />
                        <div class="d-flex justify-content-between fw-bold"><span>Total</span><span id="totalResumen">${moneda(carrito.total + 1500)}</span></div>
                    </div>
                </div>
            </div>
        </div>`;

    document.getElementById('costoEnvio').addEventListener('input', recalcular);
    document.getElementById('formCheckout').addEventListener('submit', confirmar);
}

function recalcular() {
    const costoEnvio = Number(document.getElementById('costoEnvio').value) || 0;

    document.getElementById('envioResumen').textContent = moneda(costoEnvio);
    document.getElementById('totalResumen').textContent = moneda(carrito.total + costoEnvio);
}

async function confirmar(evento) {
    evento.preventDefault();

    const costoEnvio = Number(document.getElementById('costoEnvio').value) || 0;
    const metodoPago = document.getElementById('metodoPago').value;

    const direccionEnvio = {
        provincia: document.getElementById('provincia').value.trim(),
        canton: document.getElementById('canton').value.trim(),
        distrito: document.getElementById('distrito').value.trim(),
        codigoPostal: document.getElementById('codigoPostal').value.trim(),
        direccionExacta: document.getElementById('direccionExacta').value.trim()
    };

    const boton = evento.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        const pedido = await apiFetch('/pedidos', {
            method: 'POST',
            body: JSON.stringify({
                usuario: usuario._id,
                direccionEnvio,
                costoEnvio,
                metodoPago
            })
        });

        const datos = pedido.datos;

        try {
            await apiFetch('/pagos', {
                method: 'POST',
                body: JSON.stringify({
                    pedido: datos._id,
                    metodo: metodoPago,
                    monto: datos.total
                })
            });
        } catch (error) {
            // El pedido ya quedó registrado; el pago puede completarse después
        }

        document.getElementById('contenido').innerHTML = `
            <div class="card shadow-sm">
                <div class="card-body text-center py-5">
                    <h2 class="h4">¡Pedido registrado!</h2>
                    <p class="mb-1">Número de orden: <strong>${esc(datos.numero)}</strong></p>
                    <p class="text-muted">Total: ${moneda(datos.total)}</p>
                    <a href="tienda.html" class="btn btn-primary">Volver a la tienda</a>
                </div>
            </div>`;
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
        boton.disabled = false;
    }
}
