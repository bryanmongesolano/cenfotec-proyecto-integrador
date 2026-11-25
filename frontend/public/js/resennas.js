let resennas = [];
let paginaActual = 1;
const POR_PAGINA = 10;

if (requerirAdmin()) {
    cargar();
    document.getElementById('buscar').addEventListener('input', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroCalificacion').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('tabla').addEventListener('click', manejarAccion);
}

async function cargar() {
    try {
        resennas = await apiFetch('/resennas');
        pintarKPIs();
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintarKPIs() {
    const total = resennas.length;
    const suma = resennas.reduce((acc, r) => acc + (Number(r.calificacion) || 0), 0);
    const promedio = total > 0 ? (suma / total).toFixed(1) : '0.0';
    const positivas = resennas.filter(r => Number(r.calificacion) >= 4).length;
    const criticas = resennas.filter(r => Number(r.calificacion) <= 2).length;

    document.getElementById('kpiTotalRes').textContent = String(total);
    document.getElementById('kpiPromedioRes').textContent = promedio;
    document.getElementById('kpiPositivasRes').textContent = String(positivas);
    document.getElementById('kpiCriticasRes').textContent = String(criticas);
}

function obtenerFiltradas() {
    const texto = document.getElementById('buscar').value.toLowerCase().trim();
    const calificacion = document.getElementById('filtroCalificacion').value;

    return resennas.filter(r => {
        const producto = r.producto && r.producto.nombre ? r.producto.nombre.toLowerCase() : '';
        const cliente = r.usuario ? `${r.usuario.nombre || ''} ${r.usuario.apellido || ''}`.toLowerCase() : '';
        const comentario = (r.comentario || '').toLowerCase();
        const coincide = !texto || producto.includes(texto) || cliente.includes(texto) || comentario.includes(texto);
        const califOk = !calificacion || String(r.calificacion) === calificacion;
        return coincide && califOk;
    });
}

function pintar() {
    const lista = obtenerFiltradas();
    const tabla = document.getElementById('tabla');
    const paginado = paginarLista(lista, paginaActual, POR_PAGINA);
    paginaActual = paginado.pagina;
    const paginaItems = paginado.items;

    if (!paginaItems.length) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Sin reseñas</td></tr>';
        renderizarPaginacion('paginacionResennas', 0, 1, POR_PAGINA, () => {});
        return;
    }

    tabla.innerHTML = paginaItems.map(r => {
        const producto = r.producto && r.producto.nombre ? r.producto.nombre : '—';
        const prodId = r.producto && r.producto._id ? r.producto._id : '';
        const cliente = r.usuario
            ? r.usuario.nombre + ' ' + r.usuario.apellido
            : '—';

        return `
            <tr>
                <td>
                    ${prodId
                        ? `<a href="producto.html?id=${esc(prodId)}" target="_blank" class="text-decoration-none">${esc(producto)}</a>`
                        : `<span>${esc(producto)}</span>`}
                </td>
                <td>${esc(cliente)}</td>
                <td class="text-nowrap">${estrellas(r.calificacion)} <span class="text-muted">(${r.calificacion})</span></td>
                <td style="max-width: 320px;">${esc(r.comentario)}</td>
                <td class="text-muted text-nowrap">${fechaCorta(r.fecha)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger" data-accion="eliminar" data-id="${r._id}" title="Eliminar reseña">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');

    renderizarPaginacion('paginacionResennas', lista.length, paginaActual, POR_PAGINA, (nueva) => {
        paginaActual = nueva;
        pintar();
    });
}

async function manejarAccion(evento) {
    const boton = evento.target.closest('button[data-accion="eliminar"]');
    if (!boton) return;

    const confirmado = await confirmarAccion({
        titulo: 'Eliminar reseña',
        mensaje: '¿Seguro que deseás eliminar esta reseña?',
        textoConfirmar: 'Eliminar'
    });
    if (!confirmado) return;

    try {
        await apiFetch('/resennas/' + boton.dataset.id, { method: 'DELETE' });
        mostrarAlerta('Reseña eliminada');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
