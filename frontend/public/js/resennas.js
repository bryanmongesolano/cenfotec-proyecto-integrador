let resennas = [];

if (requerirAdmin()) {
    cargar();
    document.getElementById('tabla').addEventListener('click', manejarAccion);
}

async function cargar() {
    try {
        resennas = await apiFetch('/resennas');
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintar() {
    const tabla = document.getElementById('tabla');

    if (!resennas.length) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Sin reseñas</td></tr>';
        return;
    }

    tabla.innerHTML = resennas.map(r => {
        const producto = r.producto && r.producto.nombre ? r.producto.nombre : '—';
        const cliente = r.usuario
            ? r.usuario.nombre + ' ' + r.usuario.apellido
            : '—';

        return `
            <tr>
                <td>${esc(producto)}</td>
                <td>${esc(cliente)}</td>
                <td>${estrellas(r.calificacion)}</td>
                <td>${esc(r.comentario)}</td>
                <td>${fecha(r.fecha)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger" data-accion="eliminar" data-id="${r._id}">Eliminar</button>
                </td>
            </tr>`;
    }).join('');
}

async function manejarAccion(evento) {
    const boton = evento.target.closest('button[data-accion="eliminar"]');
    if (!boton) return;

    if (!confirm('¿Eliminar esta reseña?')) return;

    try {
        await apiFetch('/resennas/' + boton.dataset.id, { method: 'DELETE' });
        mostrarAlerta('Reseña eliminada');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
