let cupones = [];
let modal = null;
let paginaActual = 1;
const POR_PAGINA = 10;

if (requerirAdmin()) {
    modal = new bootstrap.Modal(document.getElementById('modalCupon'));
    cargar();

    document.getElementById('btnNuevo').addEventListener('click', abrirNuevo);
    document.getElementById('formCupon').addEventListener('submit', guardar);
    document.getElementById('buscar').addEventListener('input', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroEstado').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroTipo').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('tabla').addEventListener('click', manejarAccion);
}

async function cargar() {
    try {
        cupones = await apiFetch('/cupones');
        pintarKPIs();
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function estaExpiradoOAgotado(c) {
    const expirado = c.fechaExpiracion && new Date(c.fechaExpiracion) < new Date();
    const agotado = c.usosMaximos > 0 && c.usosActuales >= c.usosMaximos;
    return expirado || agotado;
}

function pintarKPIs() {
    const total = cupones.length;
    const activos = cupones.filter(c => c.estado && !estaExpiradoOAgotado(c)).length;
    const usos = cupones.reduce((acc, c) => acc + (Number(c.usosActuales) || 0), 0);
    const expirados = cupones.filter(estaExpiradoOAgotado).length;

    document.getElementById('kpiTotalCup').textContent = String(total);
    document.getElementById('kpiActivosCup').textContent = String(activos);
    document.getElementById('kpiUsosCup').textContent = String(usos);
    document.getElementById('kpiExpiradosCup').textContent = String(expirados);
}

function obtenerFiltrados() {
    const texto = document.getElementById('buscar').value.toLowerCase().trim();
    const estado = document.getElementById('filtroEstado').value;
    const tipo = document.getElementById('filtroTipo').value;

    return cupones.filter(c => {
        const coincide = !texto ||
            (c.codigo || '').toLowerCase().includes(texto) ||
            (c.descripcion || '').toLowerCase().includes(texto);
        const estadoOk = estado === '' || String(c.estado) === estado;
        const tipoOk = !tipo || c.tipo === tipo;
        return coincide && estadoOk && tipoOk;
    });
}

function pintar() {
    const lista = obtenerFiltrados();
    const tabla = document.getElementById('tabla');
    const paginado = paginarLista(lista, paginaActual, POR_PAGINA);
    paginaActual = paginado.pagina;
    const paginaItems = paginado.items;

    if (!paginaItems.length) {
        tabla.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No hay cupones registrados</td></tr>';
        renderizarPaginacion('paginacionCupones', 0, 1, POR_PAGINA, () => {});
        return;
    }

    tabla.innerHTML = paginaItems.map(c => {
        const descuentoTexto = c.tipo === 'porcentaje' ? `${c.valor}%` : moneda(c.valor);
        const usosTexto = c.usosMaximos > 0 ? `${c.usosActuales || 0} / ${c.usosMaximos}` : `${c.usosActuales || 0} / ∞`;
        const expirado = c.fechaExpiracion && new Date(c.fechaExpiracion) < new Date();
        const vigenciaHtml = c.fechaExpiracion
            ? `<span class="${expirado ? 'text-danger' : 'text-muted'}">${expirado ? 'Expiró ' : 'Hasta '}${fechaCorta(c.fechaExpiracion)}</span>`
            : '<span class="text-muted">Sin vencimiento</span>';

        return `
            <tr>
                <td class="font-monospace">${esc(c.codigo)}</td>
                <td class="tabular-nums">${esc(descuentoTexto)}</td>
                <td class="tabular-nums">${c.montoMinimo > 0 ? moneda(c.montoMinimo) : '<span class="text-muted">Sin mínimo</span>'}</td>
                <td>${usosTexto}</td>
                <td>${vigenciaHtml}</td>
                <td>
                    <button type="button" class="btn btn-sm p-0 border-0 bg-transparent" data-accion="toggleEstado" data-id="${c._id}">
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

    renderizarPaginacion('paginacionCupones', lista.length, paginaActual, POR_PAGINA, (nueva) => {
        paginaActual = nueva;
        pintar();
    });
}

function abrirNuevo() {
    document.getElementById('formCupon').reset();
    document.getElementById('id').value = '';
    document.getElementById('tituloModal').textContent = 'Nuevo cupón';
    document.getElementById('tipo').value = 'porcentaje';
    document.getElementById('montoMinimo').value = '0';
    document.getElementById('usosMaximos').value = '0';
    document.getElementById('estado').value = 'true';
    modal.show();
}

function abrirEditar(id) {
    const c = cupones.find(x => x._id === id);
    if (!c) return;

    document.getElementById('id').value = c._id;
    document.getElementById('tituloModal').textContent = 'Editar cupón';
    document.getElementById('codigo').value = c.codigo || '';
    document.getElementById('descripcion').value = c.descripcion || '';
    document.getElementById('tipo').value = c.tipo || 'porcentaje';
    document.getElementById('valor').value = c.valor;
    document.getElementById('montoMinimo').value = c.montoMinimo || 0;
    document.getElementById('usosMaximos').value = c.usosMaximos || 0;
    document.getElementById('fechaExpiracion').value = c.fechaExpiracion ? new Date(c.fechaExpiracion).toISOString().slice(0, 10) : '';
    document.getElementById('estado').value = String(c.estado);
    modal.show();
}

async function guardar(evento) {
    evento.preventDefault();

    const id = document.getElementById('id').value;
    const fechaExp = document.getElementById('fechaExpiracion').value;

    const cuerpo = {
        codigo: document.getElementById('codigo').value.trim().toUpperCase(),
        descripcion: document.getElementById('descripcion').value.trim(),
        tipo: document.getElementById('tipo').value,
        valor: Number(document.getElementById('valor').value),
        montoMinimo: Number(document.getElementById('montoMinimo').value) || 0,
        usosMaximos: Number(document.getElementById('usosMaximos').value) || 0,
        fechaExpiracion: fechaExp ? new Date(fechaExp + 'T23:59:59').toISOString() : null,
        estado: document.getElementById('estado').value === 'true'
    };

    try {
        if (id) {
            await apiFetch('/cupones/' + id, { method: 'PUT', body: JSON.stringify(cuerpo) });
            mostrarAlerta('Cupón actualizado');
        } else {
            await apiFetch('/cupones', { method: 'POST', body: JSON.stringify(cuerpo) });
            mostrarAlerta('Cupón creado');
        }

        modal.hide();
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function manejarAccion(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;

    const accion = boton.dataset.accion;
    const id = boton.dataset.id;

    if (accion === 'editar') {
        abrirEditar(id);
    } else if (accion === 'toggleEstado') {
        const c = cupones.find(x => x._id === id);
        if (!c) return;
        try {
            await apiFetch('/cupones/' + id, { method: 'PUT', body: JSON.stringify({ estado: !c.estado }) });
            mostrarAlerta(`Cupón ${!c.estado ? 'activado' : 'desactivado'}`);
            cargar();
        } catch (error) {
            mostrarAlerta(error.message, 'danger');
        }
    } else if (accion === 'eliminar') {
        const c = cupones.find(x => x._id === id);
        const confirmado = await confirmarAccion({
            titulo: 'Eliminar cupón',
            mensaje: `¿Seguro que deseás eliminar el cupón "${c ? c.codigo : ''}"?`,
            textoConfirmar: 'Eliminar'
        });
        if (!confirmado) return;

        try {
            await apiFetch('/cupones/' + id, { method: 'DELETE' });
            mostrarAlerta('Cupón eliminado');
            cargar();
        } catch (error) {
            mostrarAlerta(error.message, 'danger');
        }
    }
}
