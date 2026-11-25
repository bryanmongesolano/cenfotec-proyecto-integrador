let chartTendencia = null;
let chartEstados = null;
let chartProductos = null;
let ultimosPedidosCache = [];
let stockBajoCache = [];
let modalVistaPedido = null;

document.addEventListener('DOMContentLoaded', async function () {
    if (!requerirAdmin()) return;

    modalVistaPedido = new bootstrap.Modal(document.getElementById('modalVistaRapidaPedido'));
    document.getElementById('btnActualizarDashboard').addEventListener('click', cargarDashboard);
    document.getElementById('tablaUltimosPedidos').addEventListener('click', manejarVerPedido);
    document.getElementById('tablaStockBajo').addEventListener('click', manejarReponerStock);

    await cargarDashboard();
});

async function cargarDashboard() {
    try {
        const [estadisticas, pedidos, productosStockBajo] = await Promise.all([
            apiFetch('/pedidos/estadisticas'),
            apiFetch('/pedidos'),
            apiFetch('/productos?stockBajo=true')
        ]);

        ultimosPedidosCache = (pedidos || []).slice(0, 7);
        stockBajoCache = productosStockBajo || [];

        renderizarKPIs(estadisticas);
        renderizarGraficoTendencia(estadisticas.ventasPorDia || []);
        renderizarGraficoEstados(estadisticas.pedidosPorEstado || []);
        renderizarGraficoProductos(estadisticas.productosMasVendidos || []);
        renderizarMetodosPago(estadisticas.ventasPorMetodoPago || []);
        renderizarUltimosPedidos(ultimosPedidosCache);
        renderizarStockBajo(stockBajoCache);

        const ahora = new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('subtituloDashboard').textContent = `Última actualización: ${ahora}`;
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function renderizarKPIs(est) {
    const pendientes = (est.pedidosPorEstado || []).find(item => item._id === 'pendiente');
    const cantPendientes = pendientes ? pendientes.cantidad : 0;
    const hoy = est.resumenHoy || { total: 0, pedidos: 0 };

    document.getElementById('kpiVentas').textContent = moneda(est.totalVentas || 0);
    document.getElementById('kpiTicketPromedio').textContent = `Ticket promedio: ${moneda(est.ticketPromedio || 0)}`;
    document.getElementById('kpiPedidos').textContent = String(est.totalPedidos || 0);
    document.getElementById('kpiPedidosDetalle').textContent = `${cantPendientes} pendientes · ${hoy.pedidos} hoy`;
    document.getElementById('kpiClientes').textContent = String(est.totalClientes || 0);
    document.getElementById('kpiProductosActivos').textContent = `${est.totalProductos || 0} productos activos`;
    document.getElementById('kpiStockBajo').textContent = String(est.productosStockBajo || 0);
    document.getElementById('kpiPagosPendientes').textContent = `Stock bajo · ${est.pagosPendientes || 0} pagos pend.`;
    document.getElementById('badgeVentasHoy').textContent = `Hoy: ${moneda(hoy.total || 0)}`;
}

function renderizarGraficoTendencia(ventasPorDia) {
    if (chartTendencia) chartTendencia.destroy();

    const etiquetas = ventasPorDia.map(d => {
        const partes = String(d.fecha || '').split('-');
        return partes.length === 3 ? `${partes[2]}/${partes[1]}` : d.fecha;
    });
    const montos = ventasPorDia.map(d => d.total || 0);

    const ctx = document.getElementById('graficoTendencia').getContext('2d');
    const gradiente = ctx.createLinearGradient(0, 0, 0, 260);
    gradiente.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
    gradiente.addColorStop(1, 'rgba(37, 99, 235, 0.01)');

    chartTendencia = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetas.length ? etiquetas : ['Sin datos'],
            datasets: [{
                label: 'Ventas (₡)',
                data: montos.length ? montos : [0],
                borderColor: '#2563eb',
                backgroundColor: gradiente,
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: '#2563eb',
                borderWidth: 2.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => ' ' + moneda(context.parsed.y)
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => '₡' + Number(value).toLocaleString('es-CR')
                    }
                }
            }
        }
    });
}

function renderizarGraficoEstados(pedidosPorEstado) {
    const orden = ['pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'];
    const nombres = {
        pendiente: 'Pendiente',
        pagado: 'Pagado',
        enviado: 'Enviado',
        entregado: 'Entregado',
        cancelado: 'Cancelado'
    };
    const colores = {
        pendiente: '#f59e0b',
        pagado: '#06b6d4',
        enviado: '#2563eb',
        entregado: '#16a34a',
        cancelado: '#dc2626'
    };

    const mapa = new Map(pedidosPorEstado.map(item => [item._id, item.cantidad]));
    const claves = orden.filter(e => (mapa.get(e) || 0) > 0);
    const valores = claves.map(e => mapa.get(e));

    if (chartEstados) chartEstados.destroy();

    const ctx = document.getElementById('graficoEstados').getContext('2d');
    chartEstados = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: claves.length ? claves.map(k => nombres[k]) : ['Sin pedidos'],
            datasets: [{
                data: valores.length ? valores : [1],
                backgroundColor: claves.length ? claves.map(e => colores[e]) : ['#e2e8f0'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '66%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14 } }
            }
        }
    });
}

function renderizarGraficoProductos(masVendidos) {
    if (chartProductos) chartProductos.destroy();

    const etiquetas = masVendidos.map(p => {
        const nombre = p.nombre || 'Producto';
        return nombre.length > 24 ? nombre.slice(0, 24) + '…' : nombre;
    });
    const cantidades = masVendidos.map(p => p.cantidad || 0);

    const ctx = document.getElementById('graficoProductos').getContext('2d');
    chartProductos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetas.length ? etiquetas : ['Sin ventas'],
            datasets: [{
                label: 'Unidades vendidas',
                data: cantidades.length ? cantidades : [0],
                backgroundColor: '#1e3a5f',
                borderRadius: 6,
                barThickness: 22
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

function renderizarMetodosPago(metodos) {
    const contenedor = document.getElementById('bloqueMetodosPago');
    if (!metodos.length) {
        contenedor.innerHTML = '<div class="text-center text-muted py-4 small">Sin transacciones registradas aún.</div>';
        return;
    }

    const totalMonto = metodos.reduce((acc, m) => acc + (m.total || 0), 0) || 1;
    const estilos = {
        sinpe: { label: 'SINPE Móvil', color: 'primary' },
        tarjeta: { label: 'Tarjeta', color: 'success' },
        efectivo: { label: 'Efectivo', color: 'warning' }
    };

    contenedor.innerHTML = metodos.map(m => {
        const info = estilos[m._id] || { label: m._id || 'Otro', color: 'secondary' };
        const pct = Math.round(((m.total || 0) / totalMonto) * 100);
        return `
            <div class="mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="d-flex align-items-center gap-2 small fw-semibold">
                        <span>${esc(info.label)}</span>
                        <span class="text-muted fw-normal">(${m.cantidad})</span>
                    </div>
                    <div class="text-end small">
                        <span class="fw-bold tabular-nums">${moneda(m.total)}</span>
                        <span class="text-muted ms-1">${pct}%</span>
                    </div>
                </div>
                <div class="progress" style="height: 7px;">
                    <div class="progress-bar bg-${info.color}" style="width: ${pct}%"></div>
                </div>
            </div>`;
    }).join('');
}

function renderizarUltimosPedidos(pedidos) {
    const tbody = document.getElementById('tablaUltimosPedidos');

    if (!pedidos.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Sin pedidos registrados</td></tr>';
        return;
    }

    tbody.innerHTML = pedidos.map(p => {
        const cliente = p.usuario ? `${p.usuario.nombre} ${p.usuario.apellido}` : '—';
        return `
            <tr>
                <td><strong class="text-primary">${esc(p.numero)}</strong></td>
                <td>${esc(cliente)}</td>
                <td class="small text-muted">${esc(fechaCorta(p.fecha))}</td>
                <td class="text-end fw-semibold tabular-nums">${moneda(p.total)}</td>
                <td>${badgePedido(p.estado)}</td>
                <td class="text-end">
                    <button type="button" class="btn btn-sm btn-light border" data-ver-pedido="${p._id}" title="Ver detalle">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

function renderizarStockBajo(productos) {
    const tbody = document.getElementById('tablaStockBajo');

    if (!productos.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4"><i class="bi bi-check-circle text-success me-1"></i>Todo el inventario está en orden</td></tr>';
        return;
    }

    tbody.innerHTML = productos.slice(0, 7).map(p => `
        <tr>
            <td>
                <div class="fw-semibold small">${esc(p.nombre)}</div>
                <small class="text-muted">${esc(p.sku || 'Sin SKU')} · Mín: ${p.stockMinimo ?? 0}</small>
            </td>
            <td class="text-center"><span class="badge rounded-pill bg-danger">${p.stock}</span></td>
            <td class="text-end">
                <button type="button" class="btn btn-sm btn-outline-primary" data-reponer="${p._id}">
                    <i class="bi bi-plus-circle me-1"></i>Reponer
                </button>
            </td>
        </tr>`).join('');
}

function manejarVerPedido(evento) {
    const btn = evento.target.closest('button[data-ver-pedido]');
    if (!btn) return;

    const p = ultimosPedidosCache.find(x => x._id === btn.dataset.verPedido);
    if (!p) return;

    const dir = p.direccionEnvio || {};
    document.getElementById('vrTituloPedido').textContent = `Pedido ${p.numero}`;
    document.getElementById('vrCuerpoPedido').innerHTML = `
        ${renderizarStepperPedido(p.estado)}
        <div class="row g-2 small mb-3">
            <div class="col-md-6"><strong>Cliente:</strong> ${esc(p.usuario ? p.usuario.nombre + ' ' + p.usuario.apellido : '—')}</div>
            <div class="col-md-6"><strong>Fecha:</strong> ${esc(fecha(p.fecha))}</div>
            <div class="col-md-6"><strong>Método:</strong> <span class="text-capitalize">${esc(p.metodoPago || '—')}</span></div>
            <div class="col-md-6"><strong>Estado:</strong> ${badgePedido(p.estado)}</div>
            <div class="col-12"><strong>Dirección:</strong> ${esc([dir.provincia, dir.canton, dir.distrito, dir.direccionExacta].filter(Boolean).join(', '))}</div>
        </div>
        <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
                <thead class="table-light">
                    <tr><th>Producto</th><th class="text-center">Cant.</th><th class="text-end">Subtotal</th></tr>
                </thead>
                <tbody>
                    ${(p.items || []).map(i => `
                        <tr>
                            <td>${esc(i.nombre)}</td>
                            <td class="text-center">${i.cantidad}</td>
                            <td class="text-end tabular-nums">${moneda(i.subtotal)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>
        <div class="text-end fw-bold fs-5 text-primary mt-3 tabular-nums">Total: ${moneda(p.total)}</div>`;

    modalVistaPedido.show();
}

async function manejarReponerStock(evento) {
    const btn = evento.target.closest('button[data-reponer]');
    if (!btn) return;

    const prod = stockBajoCache.find(p => p._id === btn.dataset.reponer);
    if (!prod) return;

    const sugerido = Math.max((prod.stockMinimo || 5) * 2, prod.stock + 10);
    const valor = await pedirDato({
        titulo: 'Reponer inventario',
        etiqueta: `Nuevo stock para "${prod.nombre}" (actual: ${prod.stock})`,
        valorInicial: String(sugerido),
        tipo: 'number',
        min: '0',
        obligatorio: true,
        textoConfirmar: 'Guardar stock'
    });

    if (valor === null) return;
    const stock = Number(valor);
    if (!Number.isInteger(stock) || stock < 0) {
        mostrarAlerta('Ingresá un entero mayor o igual a 0', 'warning');
        return;
    }

    try {
        await apiFetch('/productos/' + prod._id + '/stock', {
            method: 'PATCH',
            body: JSON.stringify({ stock })
        });
        mostrarAlerta('Stock actualizado correctamente');
        await cargarDashboard();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
