let carrito = null;
let usuario = null;
let direccionesGuardadas = [];
let cuponAplicado = null;

const META_ENVIO_GRATIS = 50000;
const DIRECCION_TIENDA = {
    provincia: 'San José',
    canton: 'Central',
    distrito: 'Merced',
    codigoPostal: '10102',
    direccionExacta: 'Retiro en tienda física - Mundo Trendy'
};

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
        direccionesGuardadas = perfil.direcciones || [];

        if (typeof actualizarBadgeCarrito === 'function') {
            actualizarBadgeCarrito(carrito);
        }

        if (!carrito.items.length) {
            document.getElementById('contenido').innerHTML = `
                <div class="card border-0 shadow-sm">
                    <div class="card-body text-center py-5">
                        <i class="bi bi-cart fs-1 text-muted d-block mb-2" aria-hidden="true"></i>
                        <p class="text-muted mb-3">No hay productos en el carrito.</p>
                        <a href="tienda.html" class="btn btn-primary rounded-pill px-4">Ir a la tienda</a>
                    </div>
                </div>`;
            return;
        }

        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function obtenerCostoEnvioSeleccionado() {
    const tipo = document.querySelector('input[name="tipoEnvio"]:checked')?.value || 'estandar';
    if (tipo === 'retiro') return 0;
    if (tipo === 'express') return 3000;
    return (carrito && carrito.subtotal >= META_ENVIO_GRATIS) ? 0 : 1500;
}

function pintar() {
    const direccion = direccionesGuardadas.find(d => d.esPrincipal) || direccionesGuardadas[0] || {};
    const envioEstandarGratis = carrito.subtotal >= META_ENVIO_GRATIS;

    const selectorDirecciones = direccionesGuardadas.length ? `
        <div class="mb-3">
            <label class="form-label small text-muted" for="direccionGuardada">Usar dirección guardada</label>
            <select class="form-select form-select-sm" id="direccionGuardada">
                ${direccionesGuardadas.map((d, i) => `
                    <option value="${i}" ${d === direccion ? 'selected' : ''}>
                        ${esc((d.tipo || 'casa').toUpperCase())} — ${esc([d.provincia, d.canton, d.distrito].filter(Boolean).join(', '))}
                    </option>`).join('')}
                <option value="nueva">Escribir otra dirección...</option>
            </select>
        </div>` : '';

    document.getElementById('contenido').innerHTML = `
        <div class="row g-4">
            <div class="col-12 col-lg-7">
                <form id="formCheckout" class="card border-0 shadow-sm">
                    <div class="card-body p-4">
                        <h2 class="h5 fw-bold mb-3"><i class="bi bi-truck me-2 text-primary"></i>Método de entrega</h2>

                        <div class="row g-2 mb-3" id="opcionesEnvio">
                            <div class="col-12 col-md-4">
                                <label class="card p-3 h-100 border-2 border-primary bg-primary-subtle bg-opacity-10" style="cursor: pointer;" data-choice-group="envio">
                                    <input type="radio" name="tipoEnvio" value="estandar" class="d-none" checked />
                                    <div class="fw-semibold small">Envío estándar</div>
                                    <div class="text-muted" style="font-size: 0.78rem;">2–3 días hábiles</div>
                                    <div class="fw-bold mt-1 small ${envioEstandarGratis ? 'text-success' : 'text-primary'}">${envioEstandarGratis ? 'GRATIS' : '₡1 500'}</div>
                                </label>
                            </div>
                            <div class="col-12 col-md-4">
                                <label class="card p-3 h-100 border-2 border-light-subtle" style="cursor: pointer;" data-choice-group="envio">
                                    <input type="radio" name="tipoEnvio" value="express" class="d-none" />
                                    <div class="fw-semibold small">Envío express</div>
                                    <div class="text-muted" style="font-size: 0.78rem;">24 horas GAM</div>
                                    <div class="fw-bold text-primary mt-1 small">₡3 000</div>
                                </label>
                            </div>
                            <div class="col-12 col-md-4">
                                <label class="card p-3 h-100 border-2 border-light-subtle" style="cursor: pointer;" data-choice-group="envio">
                                    <input type="radio" name="tipoEnvio" value="retiro" class="d-none" />
                                    <div class="fw-semibold small">Retiro en tienda</div>
                                    <div class="text-muted" style="font-size: 0.78rem;">San José Centro</div>
                                    <div class="fw-bold text-success mt-1 small">GRATIS</div>
                                </label>
                            </div>
                        </div>

                        <div id="avisoRetiroTienda" class="alert alert-info small d-none mb-4">
                            <i class="bi bi-shop me-1" aria-hidden="true"></i>
                            <strong>Retiro en tienda:</strong> San José Centro, Avenida Central (Lunes a Sábado, 9:00 a.m. – 6:00 p.m.).
                        </div>

                        <div id="bloqueDireccionEnvio" class="mb-4">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h3 class="h6 fw-bold mb-0">Dirección de envío</h3>
                                <a href="perfil.html#datos" class="small text-decoration-none">Gestionar direcciones</a>
                            </div>

                            ${selectorDirecciones}

                            <div class="row g-3">
                                <div class="col-12 col-md-6">
                                    <label class="form-label small" for="provincia">Provincia</label>
                                    <input type="text" class="form-control" id="provincia" value="${esc(direccion.provincia || '')}" required />
                                </div>
                                <div class="col-12 col-md-6">
                                    <label class="form-label small" for="canton">Cantón</label>
                                    <input type="text" class="form-control" id="canton" value="${esc(direccion.canton || '')}" required />
                                </div>
                                <div class="col-12 col-md-6">
                                    <label class="form-label small" for="distrito">Distrito</label>
                                    <input type="text" class="form-control" id="distrito" value="${esc(direccion.distrito || '')}" required />
                                </div>
                                <div class="col-12 col-md-6">
                                    <label class="form-label small" for="codigoPostal">Código postal</label>
                                    <input type="text" class="form-control" id="codigoPostal" inputmode="numeric" value="${esc(direccion.codigoPostal || '')}" />
                                </div>
                                <div class="col-12">
                                    <label class="form-label small" for="direccionExacta">Dirección exacta</label>
                                    <input type="text" class="form-control" id="direccionExacta" value="${esc(direccion.direccionExacta || '')}" required />
                                </div>
                            </div>
                        </div>

                        <hr class="my-4" />

                        <h2 class="h5 fw-bold mb-3"><i class="bi bi-credit-card me-2 text-primary"></i>Método de pago</h2>

                        <div class="row g-2 mb-3" id="opcionesPago">
                            <div class="col-6">
                                <label class="card p-3 border-2 border-primary bg-primary-subtle bg-opacity-10" style="cursor: pointer;" data-choice-group="pago">
                                    <input type="radio" name="metodoPago" value="sinpe" class="d-none" checked />
                                    <div class="d-flex align-items-center gap-2">
                                        <i class="bi bi-phone fs-5 text-primary"></i>
                                        <div>
                                            <div class="fw-semibold small">SINPE Móvil</div>
                                            <div class="text-muted" style="font-size: 0.75rem;">Transferencia inmediata</div>
                                        </div>
                                    </div>
                                </label>
                            </div>
                            <div class="col-6">
                                <label class="card p-3 border-2 border-light-subtle" style="cursor: pointer;" data-choice-group="pago">
                                    <input type="radio" name="metodoPago" value="tarjeta" class="d-none" />
                                    <div class="d-flex align-items-center gap-2">
                                        <i class="bi bi-credit-card-2-front fs-5 text-primary"></i>
                                        <div>
                                            <div class="fw-semibold small">Tarjeta</div>
                                            <div class="text-muted" style="font-size: 0.75rem;">Débito o crédito</div>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div id="bloqueSinpe" class="alert alert-light border mt-3 mb-0">
                            <div class="small mb-2">
                                <strong>Instrucciones SINPE Móvil:</strong> Transferí al <strong>8888-0000</strong> (Mundo Trendy) e indicá el número de comprobante.
                            </div>
                            <label class="form-label small" for="comprobanteSinpe">Número de comprobante SINPE</label>
                            <input type="text" class="form-control form-control-sm" id="comprobanteSinpe" placeholder="Ej: SINPE-123456" required />
                        </div>

                        <div id="bloqueTarjeta" class="border rounded-3 p-3 bg-light mt-3 d-none">
                            <div class="row g-2">
                                <div class="col-12">
                                    <label class="form-label small" for="tarjetaTitular">Nombre en la tarjeta</label>
                                    <input type="text" class="form-control form-control-sm" id="tarjetaTitular" placeholder="Nombre completo" />
                                </div>
                                <div class="col-12 col-md-6">
                                    <label class="form-label small" for="tarjetaNumero">Número de tarjeta</label>
                                    <input type="text" class="form-control form-control-sm" id="tarjetaNumero" inputmode="numeric" maxlength="19" placeholder="4532 0000 0000 1234" />
                                </div>
                                <div class="col-6 col-md-3">
                                    <label class="form-label small" for="tarjetaExp">Vence</label>
                                    <input type="text" class="form-control form-control-sm" id="tarjetaExp" inputmode="numeric" maxlength="5" placeholder="MM/AA" />
                                </div>
                                <div class="col-6 col-md-3">
                                    <label class="form-label small" for="tarjetaCvv">CVV</label>
                                    <input type="password" class="form-control form-control-sm" id="tarjetaCvv" inputmode="numeric" maxlength="4" placeholder="123" />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <div class="col-12 col-lg-5">
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h2 class="h5 fw-bold mb-0">Resumen del pedido</h2>
                            <a href="carrito.html" class="small text-decoration-none">Editar</a>
                        </div>
                        ${carrito.items.map(item => `
                            <div class="d-flex justify-content-between small mb-2">
                                <span>${esc(item.producto ? item.producto.nombre : 'Producto')} <span class="text-muted">× ${item.cantidad}</span></span>
                                <span class="tabular-nums">${moneda(item.precioUnitario * item.cantidad)}</span>
                            </div>`).join('')}

                        <hr />

                        <div class="mb-3">
                            <label class="form-label small fw-semibold" for="inputCupon">¿Tenés un cupón de descuento?</label>
                            <div class="input-group input-group-sm" id="grupoInputCupon">
                                <input type="text" class="form-control text-uppercase font-monospace" id="inputCupon" placeholder="Ej: BIENVENIDO15" />
                                <button type="button" class="btn btn-outline-primary" id="btnAplicarCupon">Aplicar</button>
                            </div>
                            <div id="badgeCuponAplicado" class="mt-2 d-none"></div>
                        </div>

                        <hr />

                        <div class="d-flex justify-content-between mb-1 small"><span class="text-muted">Subtotal</span><span class="tabular-nums">${moneda(carrito.subtotal)}</span></div>
                        <div class="d-flex justify-content-between mb-1 small"><span class="text-muted">Impuestos (IVA 13%)</span><span class="tabular-nums">${moneda(carrito.impuestos)}</span></div>
                        <div class="d-flex justify-content-between mb-1 small"><span class="text-muted">Envío</span><span id="envioResumen" class="tabular-nums"></span></div>
                        <div class="d-flex justify-content-between mb-1 small text-success d-none" id="filaDescuento">
                            <span id="labelDescuento">Descuento</span>
                            <span id="montoDescuento" class="tabular-nums">-₡0</span>
                        </div>
                        <hr />
                        <div class="d-flex justify-content-between fs-5 fw-bold">
                            <span>Total</span>
                            <span class="text-primary tabular-nums" id="totalResumen"></span>
                        </div>
                        <button type="submit" form="formCheckout" id="btnConfirmarPedido" class="btn btn-primary btn-lg w-100 fw-semibold mt-4">
                            <i class="bi bi-shield-check me-2"></i>Confirmar pedido
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

    const selectDir = document.getElementById('direccionGuardada');
    if (selectDir) {
        selectDir.addEventListener('change', aplicarDireccionGuardada);
    }

    document.querySelectorAll('input[name="tipoEnvio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            actualizarTarjetasOpcion('envio', radio);
            actualizarTipoEnvio();
        });
    });

    document.querySelectorAll('input[name="metodoPago"]').forEach(radio => {
        radio.addEventListener('change', () => {
            actualizarTarjetasOpcion('pago', radio);
            actualizarCamposPago();
        });
    });

    document.getElementById('tarjetaNumero').addEventListener('input', (ev) => {
        const limpio = ev.target.value.replace(/\D/g, '').slice(0, 16);
        ev.target.value = limpio.replace(/(\d{4})(?=\d)/g, '$1 ');
    });

    document.getElementById('tarjetaExp').addEventListener('input', (ev) => {
        const limpio = ev.target.value.replace(/\D/g, '').slice(0, 4);
        ev.target.value = limpio.length > 2 ? limpio.slice(0, 2) + '/' + limpio.slice(2) : limpio;
    });

    document.getElementById('btnAplicarCupon').addEventListener('click', aplicarCupon);
    document.getElementById('formCheckout').addEventListener('submit', confirmar);

    actualizarTipoEnvio();
    actualizarCamposPago();
}

function actualizarTarjetasOpcion(grupo, radioActivo) {
    document.querySelectorAll(`label[data-choice-group="${grupo}"]`).forEach(label => {
        const activa = label.contains(radioActivo);
        label.classList.toggle('border-primary', activa);
        label.classList.toggle('bg-primary-subtle', activa);
        label.classList.toggle('bg-opacity-10', activa);
        label.classList.toggle('border-light-subtle', !activa);
    });
}

async function aplicarCupon() {
    const input = document.getElementById('inputCupon');
    const codigo = input.value.trim().toUpperCase();
    if (!codigo) {
        mostrarAlerta('Ingresá un código de cupón', 'warning');
        return;
    }

    try {
        const res = await apiFetch('/cupones/validar', {
            method: 'POST',
            body: JSON.stringify({ codigo, subtotal: carrito.subtotal })
        });

        cuponAplicado = res.datos;
        input.value = '';
        document.getElementById('grupoInputCupon').classList.add('d-none');
        const badge = document.getElementById('badgeCuponAplicado');
        badge.classList.remove('d-none');
        badge.innerHTML = `
            <div class="alert alert-success py-2 px-3 small d-flex justify-content-between align-items-center mb-0">
                <span><i class="bi bi-ticket-perforated me-1"></i><strong>${esc(cuponAplicado.codigo)}</strong> (-${moneda(cuponAplicado.descuento)})</span>
                <button type="button" class="btn-close btn-sm" id="btnQuitarCupon" aria-label="Quitar cupón"></button>
            </div>`;
        document.getElementById('btnQuitarCupon').addEventListener('click', quitarCupon);
        mostrarAlerta(`Cupón ${cuponAplicado.codigo} aplicado`);
        recalcular();
    } catch (error) {
        mostrarAlerta(error.message, 'warning');
    }
}

function quitarCupon() {
    cuponAplicado = null;
    document.getElementById('grupoInputCupon').classList.remove('d-none');
    const badge = document.getElementById('badgeCuponAplicado');
    badge.classList.add('d-none');
    badge.innerHTML = '';
    recalcular();
}

function aplicarDireccionGuardada(evento) {
    const valor = evento.target.value;

    if (valor === 'nueva') {
        document.getElementById('provincia').value = '';
        document.getElementById('canton').value = '';
        document.getElementById('distrito').value = '';
        document.getElementById('codigoPostal').value = '';
        document.getElementById('direccionExacta').value = '';
        return;
    }

    const dir = direccionesGuardadas[Number(valor)];
    if (!dir) return;

    document.getElementById('provincia').value = dir.provincia || '';
    document.getElementById('canton').value = dir.canton || '';
    document.getElementById('distrito').value = dir.distrito || '';
    document.getElementById('codigoPostal').value = dir.codigoPostal || '';
    document.getElementById('direccionExacta').value = dir.direccionExacta || '';
}

function actualizarTipoEnvio() {
    const tipo = document.querySelector('input[name="tipoEnvio"]:checked')?.value || 'estandar';
    const esRetiro = tipo === 'retiro';

    document.getElementById('bloqueDireccionEnvio').classList.toggle('d-none', esRetiro);
    document.getElementById('avisoRetiroTienda').classList.toggle('d-none', !esRetiro);

    ['provincia', 'canton', 'distrito', 'direccionExacta'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.required = !esRetiro;
    });

    recalcular();
}

function actualizarCamposPago() {
    const metodo = document.querySelector('input[name="metodoPago"]:checked')?.value || 'sinpe';
    const esTarjeta = metodo === 'tarjeta';

    document.getElementById('bloqueSinpe').classList.toggle('d-none', esTarjeta);
    document.getElementById('bloqueTarjeta').classList.toggle('d-none', !esTarjeta);

    document.getElementById('comprobanteSinpe').required = !esTarjeta;
    document.getElementById('tarjetaTitular').required = esTarjeta;
    document.getElementById('tarjetaNumero').required = esTarjeta;
    document.getElementById('tarjetaExp').required = esTarjeta;
    document.getElementById('tarjetaCvv').required = esTarjeta;
}

function recalcular() {
    const costoEnvio = obtenerCostoEnvioSeleccionado();
    const descuento = cuponAplicado ? Number(cuponAplicado.descuento) || 0 : 0;
    const totalFinal = Math.max(0, carrito.total + costoEnvio - descuento);

    document.getElementById('envioResumen').textContent = costoEnvio === 0 ? 'Gratis' : moneda(costoEnvio);
    const filaDesc = document.getElementById('filaDescuento');
    filaDesc.classList.toggle('d-none', descuento <= 0);
    if (descuento > 0) {
        document.getElementById('labelDescuento').textContent = `Cupón (${cuponAplicado.codigo})`;
        document.getElementById('montoDescuento').textContent = '-' + moneda(descuento);
    }
    document.getElementById('totalResumen').textContent = moneda(totalFinal);
}

function tarjetaVencida(exp) {
    const [mesStr, annoStr] = exp.split('/');
    const mes = Number(mesStr);
    const anno = 2000 + Number(annoStr);
    const hoy = new Date();
    const annoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;

    return anno < annoActual || (anno === annoActual && mes < mesActual);
}

async function confirmar(evento) {
    evento.preventDefault();

    const tipo = document.querySelector('input[name="tipoEnvio"]:checked')?.value || 'estandar';
    const esRetiro = tipo === 'retiro';
    const costoEnvio = obtenerCostoEnvioSeleccionado();
    const metodoPago = document.querySelector('input[name="metodoPago"]:checked')?.value || 'sinpe';
    let comprobante = '';

    if (metodoPago === 'tarjeta') {
        const numeroLimpio = document.getElementById('tarjetaNumero').value.replace(/\s+/g, '');
        const exp = document.getElementById('tarjetaExp').value.trim();
        const cvv = document.getElementById('tarjetaCvv').value.trim();

        if (!/^\d{13,19}$/.test(numeroLimpio)) {
            mostrarAlerta('Ingresá un número de tarjeta válido (13 a 19 dígitos)', 'warning');
            return;
        }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) {
            mostrarAlerta('El vencimiento debe tener formato MM/AA', 'warning');
            return;
        }
        if (tarjetaVencida(exp)) {
            mostrarAlerta('La tarjeta ingresada está vencida', 'warning');
            return;
        }
        if (!/^\d{3,4}$/.test(cvv)) {
            mostrarAlerta('El CVV debe tener 3 o 4 dígitos', 'warning');
            return;
        }

        comprobante = 'TARJETA-****' + numeroLimpio.slice(-4);
    } else {
        comprobante = document.getElementById('comprobanteSinpe').value.trim();
    }

    const direccionEnvio = esRetiro
        ? { ...DIRECCION_TIENDA }
        : {
            provincia: document.getElementById('provincia').value.trim(),
            canton: document.getElementById('canton').value.trim(),
            distrito: document.getElementById('distrito').value.trim(),
            codigoPostal: document.getElementById('codigoPostal').value.trim(),
            direccionExacta: document.getElementById('direccionExacta').value.trim()
        };

    const boton = document.getElementById('btnConfirmarPedido');
    if (boton) boton.disabled = true;

    const payloadPedido = {
        usuario: usuario._id,
        direccionEnvio,
        costoEnvio,
        metodoPago
    };
    if (cuponAplicado && cuponAplicado.codigo) {
        payloadPedido.codigoCupon = cuponAplicado.codigo;
    }

    try {
        const pedido = await apiFetch('/pedidos', {
            method: 'POST',
            body: JSON.stringify(payloadPedido)
        });

        const datos = pedido.datos;
        let pagoRegistrado = true;
        let errorPago = '';

        try {
            const pagoBody = {
                pedido: datos._id,
                metodo: metodoPago,
                monto: datos.total
            };
            if (comprobante) pagoBody.comprobante = comprobante;

            await apiFetch('/pagos', {
                method: 'POST',
                body: JSON.stringify(pagoBody)
            });
        } catch (error) {
            pagoRegistrado = false;
            errorPago = error.message || 'No se pudo registrar el comprobante de pago';
        }

        if (typeof actualizarBadgeCarrito === 'function') {
            actualizarBadgeCarrito({ items: [] });
        }

        const dir = datos.direccionEnvio || direccionEnvio;
        const alertaPago = pagoRegistrado
            ? `<div class="alert alert-success small mb-3">
                   <i class="bi bi-check-circle me-1" aria-hidden="true"></i>
                   Pago registrado con <strong>${esc(metodoPago.toUpperCase())}</strong>${comprobante ? ` (${esc(comprobante)})` : ''}. Queda pendiente de verificación por la tienda.
               </div>`
            : `<div class="alert alert-warning small mb-3">
                   <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
                   Tu pedido fue creado, pero no pudimos registrar el comprobante automáticamente (${esc(errorPago)}).
               </div>`;

        document.getElementById('contenido').innerHTML = `
            <div class="card border-0 shadow-sm mx-auto" style="max-width: 740px">
                <div class="card-body p-4 p-md-5">
                    <div class="text-center mb-4">
                        <span class="rounded-circle bg-success-subtle text-success d-inline-flex align-items-center justify-content-center mb-3 fs-2" style="width: 64px; height: 64px;">
                            <i class="bi bi-check-lg"></i>
                        </span>
                        <h2 class="h4 fw-bold mb-1">¡Pedido registrado con éxito!</h2>
                        <p class="text-muted mb-0">Número de orden: <strong class="text-primary">${esc(datos.numero)}</strong> · ${esc(fecha(datos.fecha))}</p>
                    </div>

                    ${alertaPago}

                    <div class="small bg-light rounded-3 p-3 border mb-3">
                        <div><strong>Entrega:</strong> ${esRetiro ? 'Retiro en tienda (Gratis)' : esc([dir.provincia, dir.canton, dir.distrito, dir.codigoPostal, dir.direccionExacta].filter(Boolean).join(', '))}</div>
                        <div><strong>Método de pago:</strong> <span class="text-capitalize">${esc(datos.metodoPago || metodoPago)}</span></div>
                        ${datos.codigoCupon ? `<div><strong>Cupón aplicado:</strong> <span class="badge bg-success-subtle text-success">${esc(datos.codigoCupon)}</span></div>` : ''}
                    </div>

                    <div class="table-responsive mb-3">
                        <table class="table table-sm align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Producto</th>
                                    <th class="text-center">Cant.</th>
                                    <th class="text-end">Precio</th>
                                    <th class="text-end">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(datos.items || []).map(i => `
                                    <tr>
                                        <td>${esc(i.nombre)}</td>
                                        <td class="text-center">${i.cantidad}</td>
                                        <td class="text-end tabular-nums">${moneda(i.precioUnitario)}</td>
                                        <td class="text-end tabular-nums">${moneda(i.subtotal)}</td>
                                    </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="text-end small mb-4 tabular-nums">
                        <div>Subtotal: ${moneda(datos.subtotal)}</div>
                        <div>IVA (13%): ${moneda(datos.impuestos)}</div>
                        <div>Envío: ${Number(datos.costoEnvio) === 0 ? 'Gratis' : moneda(datos.costoEnvio)}</div>
                        ${datos.descuento ? `<div class="text-success">Descuento: -${moneda(datos.descuento)}</div>` : ''}
                        <div class="fs-5 fw-bold mt-1 text-primary">Total: ${moneda(datos.total)}</div>
                    </div>

                    <div class="d-flex justify-content-center gap-2 flex-wrap">
                        <a href="perfil.html" class="btn btn-primary">Ver mis pedidos</a>
                        <a href="tienda.html" class="btn btn-outline-primary">Seguir comprando</a>
                    </div>
                </div>
            </div>`;
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
        if (boton) boton.disabled = false;
    }
}
