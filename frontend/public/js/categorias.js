let categorias = [];
let modal = null;

if (requerirAdmin()) {
    modal = new bootstrap.Modal(document.getElementById('modalCategoria'));
    cargar();

    document.getElementById('btnNueva').addEventListener('click', abrirNueva);
    document.getElementById('formCategoria').addEventListener('submit', guardar);
    document.getElementById('tabla').addEventListener('click', manejarAccion);
}

async function cargar() {
    try {
        categorias = await apiFetch('/categorias');
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintar() {
    const tabla = document.getElementById('tabla');

    if (!categorias.length) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Sin categorías</td></tr>';
        return;
    }

    tabla.innerHTML = categorias.map(c => `
        <tr>
            <td>${esc(c.nombre)}</td>
            <td>${esc(c.descripcion || '—')}</td>
            <td>${esc(c.icono || '—')}</td>
            <td>${esc(c.padre && c.padre.nombre ? c.padre.nombre : '—')}</td>
            <td>${badgeActivo(c.estado)}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary" data-accion="editar" data-id="${c._id}">Editar</button>
                <button class="btn btn-sm btn-outline-danger" data-accion="eliminar" data-id="${c._id}">Eliminar</button>
            </td>
        </tr>`).join('');
}

function pintarPadres(excluirId) {
    const select = document.getElementById('padre');

    const opciones = categorias
        .filter(c => c._id !== excluirId)
        .map(c => `<option value="${c._id}">${esc(c.nombre)}</option>`)
        .join('');

    select.innerHTML = '<option value="">Sin padre</option>' + opciones;
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
    document.getElementById('descripcion').value = categoria.descripcion || '';
    document.getElementById('icono').value = categoria.icono || '';
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
        descripcion: document.getElementById('descripcion').value.trim(),
        icono: document.getElementById('icono').value.trim(),
        estado: document.getElementById('estado').value === 'true'
    };

    if (padre) cuerpo.padre = padre;

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

    if (boton.dataset.accion === 'editar') {
        abrirEditar(id);
    }

    if (boton.dataset.accion === 'eliminar') {
        if (!confirm('¿Eliminar esta categoría?')) return;

        try {
            await apiFetch('/categorias/' + id, { method: 'DELETE' });
            mostrarAlerta('Categoría eliminada');
            cargar();
        } catch (error) {
            mostrarAlerta(error.message, 'danger');
        }
    }
}
