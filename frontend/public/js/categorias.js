let categorias = [];
let conteoProductos = new Map();
let modal = null;
let paginaActual = 1;
const POR_PAGINA = 10;

if (requerirAdmin()) {
    modal = new bootstrap.Modal(document.getElementById('modalCategoria'));
    cargar();

    document.getElementById('btnNueva').addEventListener('click', abrirNueva);
    document.getElementById('formCategoria').addEventListener('submit', guardar);
    document.getElementById('buscar').addEventListener('input', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroEstado').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('tabla').addEventListener('click', manejarAccion);
}

async function cargar() {
    try {
        const [listaCategorias, listaProductos] = await Promise.all([
            apiFetch('/categorias'),
            apiFetch('/productos').catch(() => [])
        ]);

        categorias = listaCategorias || [];
        conteoProductos = new Map();

        (listaProductos || []).forEach(p => {
            const catId = p.categoria && p.categoria._id ? p.categoria._id : p.categoria;
            if (catId) {
                conteoProductos.set(catId, (conteoProductos.get(catId) || 0) + 1);
            }
        });

        pintarKPIs();
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintarKPIs() {
    const total = categorias.length;
    const principales = categorias.filter(c => !c.padre).length;
    const sub = total - principales;
    const activas = categorias.filter(c => c.estado).length;

    document.getElementById('kpiTotalCat').textContent = String(total);
    document.getElementById('kpiPrincipalesCat').textContent = String(principales);
    document.getElementById('kpiSubCat').textContent = String(sub);
    document.getElementById('kpiActivasCat').textContent = String(activas);
}

function obtenerFiltradas() {
    const texto = document.getElementById('buscar').value.toLowerCase().trim();
    const estado = document.getElementById('filtroEstado').value;

    return categorias.filter(c => {
        const coincide = !texto || (c.nombre || '').toLowerCase().includes(texto);
        const estadoOk = estado === '' || String(c.estado) === estado;
        return coincide && estadoOk;
    });
}

function pintar() {
    const lista = obtenerFiltradas();
    const tabla = document.getElementById('tabla');
    const paginado = paginarLista(lista, paginaActual, POR_PAGINA);
    paginaActual = paginado.pagina;
    const paginaItems = paginado.items;

    if (!paginaItems.length) {
        tabla.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Sin categorías</td></tr>';
        renderizarPaginacion('paginacionCategorias', 0, 1, POR_PAGINA, () => {});
        return;
    }

    tabla.innerHTML = paginaItems.map(c => {
        const totalProds = conteoProductos.get(c._id) || 0;

        return `
            <tr>
                <td>${esc(c.nombre)}</td>
                <td>${c.padre && c.padre.nombre ? `<span class="badge bg-light text-dark border">${esc(c.padre.nombre)}</span>` : '<span class="text-muted">Principal</span>'}</td>
                <td class="text-center">
                    <a href="productos.html?categoria=${encodeURIComponent(c._id)}" class="badge rounded-pill bg-light text-primary border text-decoration-none">
                        ${totalProds} producto${totalProds === 1 ? '' : 's'}
                    </a>
                </td>
                <td>
                    <button type="button" class="btn btn-sm p-0 border-0 bg-transparent" data-accion="toggleEstado" data-id="${c._id}" title="Cambiar estado">
                        ${badgeActivo(c.estado)}
                    </button>
                </td>
                <td class="text-end text-nowrap">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" data-accion="editar" data-id="${c._id}" title="Editar"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-outline-danger" data-accion="eliminar" data-id="${c._id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    renderizarPaginacion('paginacionCategorias', lista.length, paginaActual, POR_PAGINA, (nueva) => {
        paginaActual = nueva;
        pintar();
    });
}

function pintarPadres(excluirId) {
    const select = document.getElementById('padre');

    const opciones = categorias
        .filter(c => c._id !== excluirId)
        .map(c => `<option value="${c._id}">${esc(c.nombre)}</option>`)
        .join('');

    select.innerHTML = '<option value="">Sin padre (Principal)</option>' + opciones;
}

function abrirNueva() {
    document.getElementById('formCategoria').reset();
    document.getElementById('id').value = '';
    document.getElementById('tituloModal').textContent = 'Nueva categoría';
    document.getElementById('estado').value = 'true';
    pintarPadres(null);
    modal.show();
}

function abrirEditar(id) {
    const categoria = categorias.find(c => c._id === id);
    if (!categoria) return;

    document.getElementById('id').value = categoria._id;
    document.getElementById('nombre').value = categoria.nombre || '';
    document.getElementById('estado').value = String(categoria.estado);
    document.getElementById('tituloModal').textContent = 'Editar categoría';

    pintarPadres(categoria._id);
    document.getElementById('padre').value = categoria.padre && categoria.padre._id ? categoria.padre._id : '';
    modal.show();
}

async function guardar(evento) {
    evento.preventDefault();

    const id = document.getElementById('id').value;
    const padre = document.getElementById('padre').value;

    const cuerpo = {
        nombre: document.getElementById('nombre').value.trim(),
        padre: padre || null,
        estado: document.getElementById('estado').value === 'true'
    };

    try {
        if (id) {
            await apiFetch('/categorias/' + id, { method: 'PUT', body: JSON.stringify(cuerpo) });
        } else {
            await apiFetch('/categorias', { method: 'POST', body: JSON.stringify(cuerpo) });
        }

        modal.hide();
        mostrarAlerta('Categoría guardada');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function manejarAccion(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;

    const id = boton.dataset.id;
    const accion = boton.dataset.accion;

    if (accion === 'editar') {
        abrirEditar(id);
    } else if (accion === 'toggleEstado') {
        const cat = categorias.find(c => c._id === id);
        if (!cat) return;
        try {
            await apiFetch('/categorias/' + id, { method: 'PUT', body: JSON.stringify({ estado: !cat.estado }) });
            mostrarAlerta(`Categoría ${!cat.estado ? 'activada' : 'desactivada'}`);
            cargar();
        } catch (error) {
            mostrarAlerta(error.message, 'danger');
        }
    } else if (accion === 'eliminar') {
        const categoria = categorias.find(c => c._id === id);
        const confirmado = await confirmarAccion({
            titulo: 'Eliminar categoría',
            mensaje: `¿Seguro que deseás eliminar la categoría "${categoria ? categoria.nombre : ''}"?`,
            textoConfirmar: 'Eliminar'
        });
        if (!confirmado) return;

        try {
            await apiFetch('/categorias/' + id, { method: 'DELETE' });
            mostrarAlerta('Categoría eliminada');
            cargar();
        } catch (error) {
            mostrarAlerta(error.message, 'danger');
        }
    }
}
