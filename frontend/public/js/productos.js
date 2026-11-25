let productos = [];
let categorias = [];
let modal = null;
let paginaActual = 1;
const POR_PAGINA = 10;

if (requerirAdmin()) {
    modal = new bootstrap.Modal(document.getElementById('modalProducto'));
    cargar();

    document.getElementById('btnNuevo').addEventListener('click', abrirNuevo);
    document.getElementById('formProducto').addEventListener('submit', guardar);
    document.getElementById('buscar').addEventListener('input', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroCategoria').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroEstado').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('filtroEspecial').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('ordenProductos').addEventListener('change', () => { paginaActual = 1; pintar(); });
    document.getElementById('imagenes').addEventListener('input', actualizarPreviewImagenes);
    document.getElementById('tabla').addEventListener('click', manejarAccion);
}

async function cargar() {
    try {
        const [listaProductos, listaCategorias] = await Promise.all([
            apiFetch('/productos'),
            apiFetch('/categorias')
        ]);

        productos = listaProductos || [];
        categorias = listaCategorias || [];

        pintarCategorias();
        const catInicial = new URLSearchParams(location.search).get('categoria');
        if (catInicial && !document.getElementById('filtroCategoria').value) {
            document.getElementById('filtroCategoria').value = catInicial;
        }
        pintarKPIs();
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintarKPIs() {
    const total = productos.length;
    const activos = productos.filter(p => p.estado).length;
    const stockBajo = productos.filter(p => p.stock <= (p.stockMinimo || 0)).length;
    const valorInv = productos.reduce((acc, p) => acc + ((Number(p.precio) || 0) * (Number(p.stock) || 0)), 0);

    document.getElementById('kpiTotalProd').textContent = String(total);
    document.getElementById('kpiActivosProd').textContent = String(activos);
    document.getElementById('kpiStockBajoProd').textContent = String(stockBajo);
    document.getElementById('kpiValorInv').textContent = moneda(valorInv);
}

function pintarCategorias() {
    const select = document.getElementById('categoria');
    const filtro = document.getElementById('filtroCategoria');
    const valorActual = filtro.value;

    const opciones = categorias.map(c => `<option value="${c._id}">${esc(c.nombre)}</option>`).join('');
    select.innerHTML = '<option value="">Sin categoría</option>' + opciones;
    filtro.innerHTML = '<option value="">Todas</option>' + opciones;
    filtro.value = valorActual;
}

function obtenerFiltrados() {
    const texto = document.getElementById('buscar').value.toLowerCase().trim();
    const categoriaId = document.getElementById('filtroCategoria').value;
    const estado = document.getElementById('filtroEstado').value;
    const especial = document.getElementById('filtroEspecial').value;
    const orden = document.getElementById('ordenProductos').value;

    const lista = productos.filter(p => {
        const coincide = !texto ||
            (p.nombre || '').toLowerCase().includes(texto) ||
            (p.sku || '').toLowerCase().includes(texto) ||
            (p.marca || '').toLowerCase().includes(texto);
        const catOk = !categoriaId || (p.categoria && p.categoria._id === categoriaId);
        const estadoOk = estado === '' || String(p.estado) === estado;
        const especialOk = !especial ||
            (especial === 'stockBajo' && p.stock <= (p.stockMinimo || 0)) ||
            (especial === 'sinStock' && p.stock <= 0) ||
            (especial === 'destacado' && Boolean(p.destacado));

        return coincide && catOk && estadoOk && especialOk;
    });

    if (orden === 'precioDesc') lista.sort((a, b) => b.precio - a.precio);
    else if (orden === 'precioAsc') lista.sort((a, b) => a.precio - b.precio);
    else if (orden === 'stockAsc') lista.sort((a, b) => a.stock - b.stock);
    else if (orden === 'stockDesc') lista.sort((a, b) => b.stock - a.stock);
    else lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    return lista;
}

function pintar() {
    const lista = obtenerFiltrados();
    const tabla = document.getElementById('tabla');
    const paginado = paginarLista(lista, paginaActual, POR_PAGINA);
    paginaActual = paginado.pagina;
    const paginaItems = paginado.items;

    if (!paginaItems.length) {
        tabla.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No se encontraron productos</td></tr>';
        renderizarPaginacion('paginacionProductos', 0, 1, POR_PAGINA, () => {});
        return;
    }

    tabla.innerHTML = paginaItems.map(p => {
        const categoria = p.categoria && p.categoria.nombre ? p.categoria.nombre : '—';
        const imagen = p.imagenes && p.imagenes.length
            ? `<img src="${esc(p.imagenes[0])}" class="thumb rounded border" alt="${esc(p.nombre)}" onerror="this.src='img/placeholder.svg'">`
            : '<img src="img/placeholder.svg" class="thumb rounded border" alt="Sin imagen">';
        const esBajo = p.stock <= (p.stockMinimo || 0);
        const stockHtml = esBajo
            ? `<span class="badge rounded-pill bg-danger">${p.stock}</span>`
            : `<span class="fw-semibold">${p.stock}</span>`;
        const meta = [p.sku ? `SKU: ${p.sku}` : '', p.marca || ''].filter(Boolean).join(' · ');

        return `
            <tr>
                <td>${imagen}</td>
                <td>
                    <div class="fw-semibold">${esc(p.nombre)}</div>
                    <div class="d-flex flex-wrap gap-1 align-items-center mt-1">
                        ${meta ? `<small class="text-muted me-1">${esc(meta)}</small>` : ''}
                        ${p.destacado ? '<span class="badge bg-primary-subtle text-primary">Destacado</span>' : ''}
                    </div>
                </td>
                <td><span class="badge bg-light text-dark border">${esc(categoria)}</span></td>
                <td class="text-end fw-semibold">${moneda(p.precio)}</td>
                <td class="text-end">${stockHtml}</td>
                <td>
                    <button type="button" class="btn btn-sm p-0 border-0 bg-transparent" data-accion="toggleEstado" data-id="${p._id}" title="Cambiar estado">
                        ${badgeActivo(p.estado)}
                    </button>
                </td>
                <td class="text-end text-nowrap">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" data-accion="editar" data-id="${p._id}" title="Editar"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-outline-secondary" data-accion="stock" data-id="${p._id}" title="Ajustar stock"><i class="bi bi-boxes"></i></button>
                        <button class="btn btn-outline-danger" data-accion="eliminar" data-id="${p._id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    renderizarPaginacion('paginacionProductos', lista.length, paginaActual, POR_PAGINA, (nueva) => {
        paginaActual = nueva;
        pintar();
    });
}

function actualizarPreviewImagenes() {
    const urls = document.getElementById('imagenes').value
        .split(/[\n,]+/)
        .map(u => u.trim())
        .filter(Boolean)
        .slice(0, 6);

    const contenedor = document.getElementById('previewImagenes');
    if (!urls.length) {
        contenedor.innerHTML = '';
        return;
    }

    contenedor.innerHTML = urls.map(url =>
        `<img src="${esc(url)}" class="preview-img-box rounded border" alt="Vista previa" onerror="this.style.opacity='0.3'" />`
    ).join('');
}

function abrirNuevo() {
    document.getElementById('formProducto').reset();
    document.getElementById('id').value = '';
    document.getElementById('tituloModal').textContent = 'Nuevo producto';
    document.getElementById('categoria').value = '';
    document.getElementById('stockMinimo').value = '3';
    document.getElementById('estado').value = 'true';
    actualizarPreviewImagenes();
    modal.show();
}

function abrirEditar(id) {
    const p = productos.find(x => x._id === id);
    if (!p) return;

    document.getElementById('id').value = p._id;
    document.getElementById('nombre').value = p.nombre || '';
    document.getElementById('descripcion').value = p.descripcion || '';
    document.getElementById('precio').value = p.precio;
    document.getElementById('stock').value = p.stock;
    document.getElementById('stockMinimo').value = p.stockMinimo ?? 0;
    document.getElementById('categoria').value = p.categoria && p.categoria._id ? p.categoria._id : '';
    document.getElementById('marca').value = p.marca || '';
    document.getElementById('sku').value = p.sku || '';
    document.getElementById('imagenes').value = (p.imagenes || []).join('\n');
    document.getElementById('destacado').checked = !!p.destacado;
    document.getElementById('estado').value = String(p.estado);
    document.getElementById('tituloModal').textContent = 'Editar producto';

    actualizarPreviewImagenes();
    modal.show();
}

async function guardar(evento) {
    evento.preventDefault();

    const id = document.getElementById('id').value;
    const sku = document.getElementById('sku').value.trim();
    const categoria = document.getElementById('categoria').value;

    const cuerpo = {
        nombre: document.getElementById('nombre').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim(),
        precio: Number(document.getElementById('precio').value),
        stock: Number(document.getElementById('stock').value),
        stockMinimo: Number(document.getElementById('stockMinimo').value),
        marca: document.getElementById('marca').value.trim(),
        categoria: categoria || null,
        imagenes: document.getElementById('imagenes').value
            .split(/[\n,]+/)
            .map(url => url.trim())
            .filter(Boolean),
        destacado: document.getElementById('destacado').checked,
        estado: document.getElementById('estado').value === 'true'
    };

    if (sku || id) {
        cuerpo.sku = sku;
    }

    try {
        if (id) {
            await apiFetch('/productos/' + id, { method: 'PUT', body: JSON.stringify(cuerpo) });
        } else {
            await apiFetch('/productos', { method: 'POST', body: JSON.stringify(cuerpo) });
        }

        modal.hide();
        mostrarAlerta('Producto guardado correctamente');
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

    if (accion === 'editar') abrirEditar(id);
    else if (accion === 'stock') await ajustarStock(id);
    else if (accion === 'toggleEstado') await alternarEstado(id);
    else if (accion === 'eliminar') await eliminar(id);
}

async function alternarEstado(id) {
    const prod = productos.find(p => p._id === id);
    if (!prod) return;

    try {
        await apiFetch('/productos/' + id, {
            method: 'PUT',
            body: JSON.stringify({ estado: !prod.estado })
        });
        mostrarAlerta(`Producto ${!prod.estado ? 'activado' : 'desactivado'}`);
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function ajustarStock(id) {
    const producto = productos.find(p => p._id === id);
    if (!producto) return;

    const valor = await pedirDato({
        titulo: 'Ajustar stock',
        etiqueta: 'Nuevo stock para ' + producto.nombre,
        valorInicial: String(producto.stock),
        tipo: 'number',
        min: '0',
        obligatorio: true,
        textoConfirmar: 'Actualizar'
    });
    if (valor === null) return;

    const stock = Number(valor);

    if (!Number.isInteger(stock) || stock < 0) {
        mostrarAlerta('El stock debe ser un entero mayor o igual a 0', 'warning');
        return;
    }

    try {
        await apiFetch('/productos/' + id + '/stock', {
            method: 'PATCH',
            body: JSON.stringify({ stock })
        });

        mostrarAlerta('Stock actualizado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function eliminar(id) {
    const producto = productos.find(p => p._id === id);
    const confirmado = await confirmarAccion({
        titulo: 'Eliminar producto',
        mensaje: `¿Seguro que deseás eliminar "${producto ? producto.nombre : 'este producto'}"?`,
        textoConfirmar: 'Eliminar'
    });
    if (!confirmado) return;

    try {
        await apiFetch('/productos/' + id, { method: 'DELETE' });
        mostrarAlerta('Producto eliminado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
