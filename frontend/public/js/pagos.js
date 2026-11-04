let pagos = [];

if (requerirAdmin()) {
    cargar();

    document.getElementById('filtroEstado').addEventListener('change', pintar);
    document.getElementById('tabla').addEventListener('click', manejarAccion);
}

async function cargar() {
    try {
        pagos = await apiFetch('/pagos');
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintar() {
    const estado = document.getElementById('filtroEstado').value;
    const lista = estado ? pagos.filter(p => p.estado === estado) : pagos;
    const tabla = document.getElementById('tabla');

    if (!lista.length) {
        tabla.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Sin pagos</td></tr>';
        return;
    }

    tabla.innerHTML = lista.map(p => {
        const pedido = p.pedido && p.pedido.numero ? p.pedido.numero : '—';
        const comprobante = p.comprobante
            ? `<a href="${esc(p.comprobante)}" target="_blank" rel="noopener">Ver</a>`
            : '—';

        const badge = {
            pendiente: 'warning',
            aprobado: 'success',
            rechazado: 'danger'
        }[p.estado] || 'secondary';

        return `
            <tr>
                <td>${esc(pedido)}</td>
                <td>${esc(p.metodo)}</td>
                <td class="text-end">${moneda(p.monto)}</td>
                <td><span class="badge bg-${badge}">${esc(p.estado)}</span></td>
                <td>${comprobante}</td>
                <td>${fecha(p.fecha)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-success" data-accion="aprobar" data-id="${p._id}">Aprobar</button>
                    <button class="btn btn-sm btn-outline-danger" data-accion="rechazar" data-id="${p._id}">Rechazar</button>
                </td>
            </tr>`;
    }).join('');
}

async function manejarAccion(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;

    const estado = boton.dataset.accion === 'aprobar' ? 'aprobado' : 'rechazado';

    try {
        await apiFetch('/pagos/' + boton.dataset.id, {
            method: 'PUT',
            body: JSON.stringify({ estado })
        });

        mostrarAlerta('Pago ' + estado);
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
