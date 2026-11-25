let pedidos = [];
let modal = null;
let pedidoActual = null;
let paginaActual = 1;
const POR_PAGINA = 10;

if (requerirAdmin()) {
    modal = new bootstrap.Modal(document.getElementById('modalPedido'));
    const qInicial = new URLSearchParams(location.search).get('q');
    if (qInicial) {
        document.getElementById('buscar').value = qInicial;
    }

    cargar();

    document.getElementById('buscar').addEventListener('input', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroEstado').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroMetodo').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('nuevoEstado').addEventListener('change', toggleMotivoCancelacion);
    document.getElementById('tabla').addEventListener('click', manejarAccion);
    document.getElementById('btnEstado').addEventListener('click', actualizarEstado);
}

async function cargar() {
    try {
        pedidos = await apiFetch('/pedidos');
        pintarKPIs();
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintarKPIs() {
    const total = pedidos.length;
    const pendientes = pedidos.filter(p => p.estado === 'pendiente').length;
    const entregados = pedidos.filter(p => p.estado === 'entregado').length;
    const ingresos = pedidos.filter(p => p.estado !== 'cancelado').reduce((acc, p) => acc + (Number(p.total) || 0), 0);

    document.getElementById('kpiTotalPed').textContent = String(total);
    document.getElementById('kpiPendPed').textContent = String(pendientes);
    document.getElementById('kpiEntregadosPed').textContent = String(entregados);
    document.getElementById('kpiIngresosPed').textContent = moneda(ingresos);
}

function obtenerFiltrados() {
    const texto = document.getElementById('buscar').value.toLowerCase().trim();
    const estado = document.getElementById('filtroEstado').value;
    const metodo = document.getElementById('filtroMetodo').value;

    return pedidos.filter(p => {
        const cliente = p.usuario ? `${p.usuario.nombre || ''} ${p.usuario.apellido || ''} ${p.usuario.correo || ''}`.toLowerCase() : '';
        const cupon = (p.codigoCupon || '').toLowerCase();
        const coincide = !texto || (p.numero || '').toLowerCase().includes(texto) || cliente.includes(texto) || cupon.includes(texto);
        const estadoOk = !estado || p.estado === estado;
        const metodoOk = !metodo || p.metodoPago === metodo;
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
        tabla.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Sin pedidos</td></tr>';
        renderizarPaginacion('paginacionPedidos', 0, 1, POR_PAGINA, () => {});
        return;
    }

    tabla.innerHTML = paginaItems.map(p => {
        const cliente = p.usuario ? p.usuario.nombre + ' ' + p.usuario.apellido : '—';

        return `
            <tr>
                <td>
                    <div class="text-primary">${esc(p.numero)}</div>
                    ${p.codigoCupon ? `<div><span class="badge bg-success-subtle text-success">${esc(p.codigoCupon)}</span></div>` : ''}
                </td>
                <td>
                    <div>${esc(cliente)}</div>
                    ${p.usuario && p.usuario.correo ? `<div class="text-muted">${esc(p.usuario.correo)}</div>` : ''}
                </td>
                <td class="text-muted">${fecha(p.fecha)}</td>
                <td class="text-capitalize">${esc(p.metodoPago || '—')}</td>
                <td class="text-end">${moneda(p.total)}</td>
                <td>${badgePedido(p.estado)}</td>
                <td class="text-end text-nowrap">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" data-accion="ver" data-id="${p._id}" title="Ver detalle"><i class="bi bi-eye"></i></button>
                        <button class="btn btn-outline-danger" data-accion="eliminar" data-id="${p._id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    renderizarPaginacion('paginacionPedidos', lista.length, paginaActual, POR_PAGINA, (nueva) => {
        paginaActual = nueva;
        pintar();
    });
}

function toggleMotivoCancelacion() {
    const mostrar = pedidoActual &&
        document.getElementById('nuevoEstado').value === 'cancelado' &&
        pedidoActual.estado !== 'cancelado';

    document.getElementById('bloqueMotivoCancelacion').classList.toggle('d-none', !mostrar);
}

async function manejarAccion(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;

    const id = boton.dataset.id;
    const accion = boton.dataset.accion;

    if (accion === 'eliminar') {
        await eliminarPedido(id);
        return;
    }

    if (accion !== 'ver') return;

    pedidoActual = pedidos.find(p => p._id === id);
    if (!pedidoActual) return;

    document.getElementById('detalleNumero').textContent = pedidoActual.numero;
    document.getElementById('detalleStepper').innerHTML = renderizarStepperPedido(pedidoActual.estado);
    document.getElementById('detalleCliente').textContent = pedidoActual.usuario
        ? pedidoActual.usuario.nombre + ' ' + pedidoActual.usuario.apellido + ' (' + pedidoActual.usuario.correo + ')'
        : '—';
    document.getElementById('detalleFecha').textContent = fecha(pedidoActual.fecha);

    const d = pedidoActual.direccionEnvio || {};
    document.getElementById('detalleDireccion').textContent = [
        d.provincia, d.canton, d.distrito, d.codigoPostal, d.direccionExacta
    ].filter(Boolean).join(', ') || '—';

    document.getElementById('detallePago').textContent = pedidoActual.metodoPago || '—';
    const infoExtra = [];
    if (pedidoActual.codigoCupon) infoExtra.push(`Cupón: ${pedidoActual.codigoCupon}`);
    if (pedidoActual.motivoCancelacion) infoExtra.push(`Cancelación: ${pedidoActual.motivoCancelacion}`);
    document.getElementById('detalleMotivo').textContent = infoExtra.join(' · ') || '—';

    document.getElementById('detalleItems').innerHTML = (pedidoActual.items || []).map(i => `
        <tr>
            <td>${esc(i.nombre)}</td>
            <td class="text-end">${i.cantidad}</td>
            <td class="text-end">${moneda(i.precioUnitario)}</td>
            <td class="text-end">${moneda(i.subtotal)}</td>
        </tr>`).join('');

    document.getElementById('detalleTotales').innerHTML = `
        <div class="d-flex justify-content-between mb-1"><span class="text-muted">Subtotal</span><span>${moneda(pedidoActual.subtotal)}</span></div>
        <div class="d-flex justify-content-between mb-1"><span class="text-muted">Impuestos (IVA 13%)</span><span>${moneda(pedidoActual.impuestos)}</span></div>
        <div class="d-flex justify-content-between mb-1"><span class="text-muted">Envío</span><span>${Number(pedidoActual.costoEnvio) === 0 ? 'Gratis' : moneda(pedidoActual.costoEnvio)}</span></div>
        ${pedidoActual.descuento ? `<div class="d-flex justify-content-between mb-1 text-success"><span>Descuento${pedidoActual.codigoCupon ? ' (' + esc(pedidoActual.codigoCupon) + ')' : ''}</span><span>-${moneda(pedidoActual.descuento)}</span></div>` : ''}
        <div class="d-flex justify-content-between fs-5 fw-bold text-primary pt-1"><span>Total</span><span>${moneda(pedidoActual.total)}</span></div>`;

    document.getElementById('nuevoEstado').value = pedidoActual.estado;
    document.getElementById('motivoCancelacionInput').value = '';
    toggleMotivoCancelacion();
    modal.show();
}

async function actualizarEstado() {
    if (!pedidoActual) return;

    const estado = document.getElementById('nuevoEstado').value;
    const cuerpo = { estado };

    if (estado === 'cancelado' && pedidoActual.estado !== 'cancelado') {
        const motivo = document.getElementById('motivoCancelacionInput').value.trim();
        if (motivo) cuerpo.motivo = motivo;
    }

    try {
        await apiFetch('/pedidos/' + pedidoActual._id + '/estado', {
            method: 'PATCH',
            body: JSON.stringify(cuerpo)
        });

        modal.hide();
        mostrarAlerta('Estado del pedido actualizado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function eliminarPedido(id) {
    const pedido = pedidos.find(p => p._id === id);
    const confirmado = await confirmarAccion({
        titulo: 'Eliminar pedido',
        mensaje: `¿Seguro que deseás eliminar el pedido ${pedido ? pedido.numero : ''}? Si no estaba cancelado, se devolverá el stock.`,
        textoConfirmar: 'Eliminar'
    });
    if (!confirmado) return;

    try {
        await apiFetch('/pedidos/' + id, { method: 'DELETE' });
        mostrarAlerta('Pedido eliminado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
