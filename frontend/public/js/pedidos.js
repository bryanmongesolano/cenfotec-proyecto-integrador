let pedidos = [];
let modal = null;
let pedidoActual = null;

if (requerirAdmin()) {
    modal = new bootstrap.Modal(document.getElementById('modalPedido'));
    cargar();

    document.getElementById('filtroEstado').addEventListener('change', pintar);
    document.getElementById('tabla').addEventListener('click', manejarAccion);
    document.getElementById('btnEstado').addEventListener('click', actualizarEstado);
}

async function cargar() {
    try {
        pedidos = await apiFetch('/pedidos');
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintar() {
    const estado = document.getElementById('filtroEstado').value;
    const lista = estado ? pedidos.filter(p => p.estado === estado) : pedidos;
    const tabla = document.getElementById('tabla');

    if (!lista.length) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Sin pedidos</td></tr>';
        return;
    }

    tabla.innerHTML = lista.map(p => {
        const cliente = p.usuario ? p.usuario.nombre + ' ' + p.usuario.apellido : '—';

        return `
            <tr>
                <td>${esc(p.numero)}</td>
                <td>${esc(cliente)}</td>
                <td>${fecha(p.fecha)}</td>
                <td class="text-end">${moneda(p.total)}</td>
                <td>${badgePedido(p.estado)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary" data-accion="ver" data-id="${p._id}">Ver</button>
                </td>
            </tr>`;
    }).join('');
}

function manejarAccion(evento) {
    const boton = evento.target.closest('button[data-accion="ver"]');
    if (!boton) return;

    pedidoActual = pedidos.find(p => p._id === boton.dataset.id);
    if (!pedidoActual) return;

    document.getElementById('detalleNumero').textContent = pedidoActual.numero;
    document.getElementById('detalleCliente').textContent = pedidoActual.usuario
        ? pedidoActual.usuario.nombre + ' ' + pedidoActual.usuario.apellido + ' (' + pedidoActual.usuario.correo + ')'
        : '—';
    document.getElementById('detalleFecha').textContent = fecha(pedidoActual.fecha);

    const d = pedidoActual.direccionEnvio || {};
    document.getElementById('detalleDireccion').textContent = [
        d.provincia, d.canton, d.distrito, d.codigoPostal, d.direccionExacta
    ].filter(Boolean).join(', ') || '—';

    document.getElementById('detallePago').textContent = pedidoActual.metodoPago || '—';
    document.getElementById('detalleMotivo').textContent = pedidoActual.motivoCancelacion || '—';

    document.getElementById('detalleItems').innerHTML = (pedidoActual.items || []).map(i => `
        <tr>
            <td>${esc(i.nombre)}</td>
            <td class="text-end">${i.cantidad}</td>
            <td class="text-end">${moneda(i.precioUnitario)}</td>
            <td class="text-end">${moneda(i.subtotal)}</td>
        </tr>`).join('');

    document.getElementById('detalleTotales').innerHTML = `
        <div class="d-flex justify-content-between"><span>Subtotal</span><span>${moneda(pedidoActual.subtotal)}</span></div>
        <div class="d-flex justify-content-between"><span>Impuestos</span><span>${moneda(pedidoActual.impuestos)}</span></div>
        <div class="d-flex justify-content-between"><span>Envío</span><span>${moneda(pedidoActual.costoEnvio)}</span></div>
        <div class="d-flex justify-content-between"><span>Descuento</span><span>-${moneda(pedidoActual.descuento)}</span></div>
        <div class="d-flex justify-content-between fw-bold"><span>Total</span><span>${moneda(pedidoActual.total)}</span></div>`;

    document.getElementById('nuevoEstado').value = pedidoActual.estado;
    modal.show();
}

async function actualizarEstado() {
    if (!pedidoActual) return;

    const estado = document.getElementById('nuevoEstado').value;
    const cuerpo = { estado };

    if (estado === 'cancelado' && pedidoActual.estado !== 'cancelado') {
        const motivo = prompt('Motivo de la cancelación');
        if (motivo === null) return;
        cuerpo.motivo = motivo;
    }

    try {
        await apiFetch('/pedidos/' + pedidoActual._id + '/estado', {
            method: 'PATCH',
            body: JSON.stringify(cuerpo)
        });

        modal.hide();
        mostrarAlerta('Estado actualizado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
