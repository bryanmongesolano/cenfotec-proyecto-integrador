let pagos = [];
let paginaActual = 1;
const POR_PAGINA = 10;

if (requerirAdmin()) {
    cargar();

    document.getElementById('buscar').addEventListener('input', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroEstado').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroMetodo').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('tabla').addEventListener('click', manejarAccion);
}

async function cargar() {
    try {
        pagos = await apiFetch('/pagos');
        pintarKPIs();
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintarKPIs() {
    const aprobados = pagos.filter(p => p.estado === 'aprobado');
    const pendientes = pagos.filter(p => p.estado === 'pendiente');
    const rechazados = pagos.filter(p => p.estado === 'rechazado');
    const montoAprobado = aprobados.reduce((acc, p) => acc + (Number(p.monto) || 0), 0);

    document.getElementById('kpiAprobadoMonto').textContent = moneda(montoAprobado);
    document.getElementById('kpiPendPagos').textContent = String(pendientes.length);
    document.getElementById('kpiCantAprobados').textContent = String(aprobados.length);
    document.getElementById('kpiCantRechazados').textContent = String(rechazados.length);
}

function obtenerFiltrados() {
    const texto = document.getElementById('buscar').value.toLowerCase().trim();
    const estado = document.getElementById('filtroEstado').value;
    const metodo = document.getElementById('filtroMetodo').value;

    return pagos.filter(p => {
        const numPedido = p.pedido && p.pedido.numero ? p.pedido.numero.toLowerCase() : '';
        const met = (p.metodo || '').toLowerCase();
        const comp = (p.comprobante || '').toLowerCase();
        const coincide = !texto || numPedido.includes(texto) || met.includes(texto) || comp.includes(texto);
        const estadoOk = !estado || p.estado === estado;
        const metodoOk = !metodo || p.metodo === metodo;
        return coincide && estadoOk && metodoOk;
    });
}

function pintar() {
    const lista = obtenerFiltrados();
    const tabla = document.getElementById('tabla');
    const paginado = paginarLista(lista, paginaActual, POR_PAGINA);
    paginaActual = paginado.pagina;
    const paginaItems = paginado.items;

    if (!paginaItems.length) {
        tabla.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Sin pagos registrados</td></tr>';
        renderizarPaginacion('paginacionPagos', 0, 1, POR_PAGINA, () => {});
        return;
    }

    tabla.innerHTML = paginaItems.map(p => {
        const pedidoNum = p.pedido && p.pedido.numero ? p.pedido.numero : '—';
        const estadoPedido = p.pedido && p.pedido.estado
            ? `<div class="mt-1">${badgePedido(p.pedido.estado)}</div>`
            : '';

        let comprobante = '<span class="text-muted small">Sin comprobante</span>';
        if (p.comprobante) {
            comprobante = /^https?:\/\//i.test(p.comprobante)
                ? `<a href="${esc(p.comprobante)}" target="_blank" rel="noopener" class="btn btn-sm btn-link p-0 text-decoration-none"><i class="bi bi-box-arrow-up-right me-1"></i>Ver enlace</a>`
                : `<button type="button" class="btn btn-sm btn-light border font-monospace py-0 px-2" data-accion="copiar" data-texto="${esc(p.comprobante)}" title="Copiar comprobante">${esc(p.comprobante)}</button>`;
        }

        const iconoMetodo = p.metodo === 'sinpe' ? 'phone' : 'credit-card';

        return `
            <tr>
                <td>
                    <strong class="text-primary">${esc(pedidoNum)}</strong>
                    ${estadoPedido}
                </td>
                <td>
                    <span class="badge bg-light text-dark border text-capitalize">
                        <i class="bi bi-${iconoMetodo} me-1"></i>${esc(p.metodo)}
                    </span>
                </td>
                <td class="text-end fw-semibold tabular-nums">${moneda(p.monto)}</td>
                <td>${badgePago(p.estado)}</td>
                <td>${comprobante}</td>
                <td class="small text-muted">${fecha(p.fecha)}</td>
                <td class="text-end text-nowrap">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-success" data-accion="aprobar" data-id="${p._id}" ${p.estado === 'aprobado' ? 'disabled' : ''} title="Aprobar pago">
                            <i class="bi bi-check-lg me-1"></i>Aprobar
                        </button>
                        <button class="btn btn-outline-danger" data-accion="rechazar" data-id="${p._id}" ${p.estado === 'rechazado' ? 'disabled' : ''} title="Rechazar pago">
                            <i class="bi bi-x-lg"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    renderizarPaginacion('paginacionPagos', lista.length, paginaActual, POR_PAGINA, (nueva) => {
        paginaActual = nueva;
        pintar();
    });
}

async function manejarAccion(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton || boton.disabled) return;

    const accion = boton.dataset.accion;

    if (accion === 'copiar') {
        await copiarTexto(boton.dataset.texto || '', 'Comprobante copiado');
        return;
    }

    const estado = accion === 'aprobar' ? 'aprobado' : 'rechazado';

    if (accion === 'rechazar') {
        const confirmado = await confirmarAccion({
            titulo: 'Rechazar pago',
            mensaje: '¿Seguro que deseás marcar este pago como rechazado?',
            textoConfirmar: 'Rechazar'
        });
        if (!confirmado) return;
    }

    try {
        await apiFetch('/pagos/' + boton.dataset.id, {
            method: 'PUT',
            body: JSON.stringify({ estado })
        });

        mostrarAlerta(estado === 'aprobado' ? 'Pago aprobado y pedido sincronizado' : 'Pago rechazado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
