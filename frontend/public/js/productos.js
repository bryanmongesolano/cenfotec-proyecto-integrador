let productos = [];
let categorias = [];
let modal = null;

if (requerirAdmin()) {
    modal = new bootstrap.Modal(document.getElementById('modalProducto'));
    cargar();

    document.getElementById('btnNuevo').addEventListener('click', abrirNuevo);
    document.getElementById('formProducto').addEventListener('submit', guardar);
    document.getElementById('buscar').addEventListener('input', pintar);
    document.getElementById('filtroEstado').addEventListener('change', pintar);
    document.getElementById('tabla').addEventListener('click', manejarAccion);
}

async function cargar() {
    try {
        const [listaProductos, listaCategorias] = await Promise.all([
            apiFetch('/productos'),
            apiFetch('/categorias')
        ]);

        productos = listaProductos;
        categorias = listaCategorias;

        pintarCategorias();
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintarCategorias() {
    const select = document.getElementById('categoria');

    select.innerHTML = '<option value="">Sin categoría</option>' +
        categorias.map(c => `<option value="${c._id}">${esc(c.nombre)}</option>`).join('');
}

function pintar() {
    const texto = document.getElementById('buscar').value.toLowerCase();
    const estado = document.getElementById('filtroEstado').value;

    const lista = productos.filter(p => {
        const coincide = (p.nombre || '').toLowerCase().includes(texto);
        const estadoOk = estado === '' || String(p.estado) === estado;
        return coincide && estadoOk;
    });

    const tabla = document.getElementById('tabla');

    if (!lista.length) {
        tabla.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Sin productos</td></tr>';
        return;
    }

    tabla.innerHTML = lista.map(p => {
        const categoria = p.categoria && p.categoria.nombre ? p.categoria.nombre : '—';
        const imagen = p.imagenes && p.imagenes.length
            ? `<img src="${esc(p.imagenes[0])}" class="thumb" alt="${esc(p.nombre)}">`
            : '<div class="thumb"></div>';
        const stock = p.stock <= p.stockMinimo
            ? `<span class="badge bg-danger">${p.stock}</span>`
            : p.stock;

        return `
            <tr>
                <td>${imagen}</td>
                <td>${esc(p.nombre)}</td>
                <td>${esc(categoria)}</td>
                <td class="text-end">${moneda(p.precio)}</td>
                <td class="text-end">${stock}</td>
                <td>${badgeActivo(p.estado)}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary" data-accion="editar" data-id="${p._id}">Editar</button>
                    <button class="btn btn-sm btn-outline-secondary" data-accion="stock" data-id="${p._id}">Stock</button>
                    <button class="btn btn-sm btn-outline-danger" data-accion="eliminar" data-id="${p._id}">Eliminar</button>
                </td>
            </tr>`;
    }).join('');
}

function abrirNuevo() {
    document.getElementById('formProducto').reset();
    document.getElementById('id').value = '';
    document.getElementById('tituloModal').textContent = 'Nuevo producto';
    document.getElementById('categoria').value = '';
    document.getElementById('estado').value = 'true';
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
    document.getElementById('stockMinimo').value = p.stockMinimo;
    document.getElementById('categoria').value = p.categoria && p.categoria._id ? p.categoria._id : '';
    document.getElementById('marca').value = p.marca || '';
    document.getElementById('sku').value = p.sku || '';
    document.getElementById('imagenes').value = (p.imagenes || []).join('\n');
    document.getElementById('viral').checked = !!p.viral;
    document.getElementById('destacado').checked = !!p.destacado;
    document.getElementById('estado').value = String(p.estado);
    document.getElementById('tituloModal').textContent = 'Editar producto';

    modal.show();
}

async function guardar(evento) {
    evento.preventDefault();

    const id = document.getElementById('id').value;

    const cuerpo = {
        nombre: document.getElementById('nombre').value.trim(),
        descripcion: document.getElementById('descripcion').value.trim(),
        precio: Number(document.getElementById('precio').value),
        stock: Number(document.getElementById('stock').value),
        stockMinimo: Number(document.getElementById('stockMinimo').value),
        marca: document.getElementById('marca').value.trim(),
        sku: document.getElementById('sku').value.trim(),
        imagenes: document.getElementById('imagenes').value
            .split(/[\n,]+/)
            .map(url => url.trim())
            .filter(Boolean),
        viral: document.getElementById('viral').checked,
        destacado: document.getElementById('destacado').checked,
        estado: document.getElementById('estado').value === 'true'
    };

    const categoria = document.getElementById('categoria').value;
    if (categoria) cuerpo.categoria = categoria;

    try {
        if (id) {
            await apiFetch('/productos/' + id, { method: 'PUT', body: JSON.stringify(cuerpo) });
        } else {
            await apiFetch('/productos', { method: 'POST', body: JSON.stringify(cuerpo) });
        }

        modal.hide();
        mostrarAlerta('Producto guardado');
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

    if (boton.dataset.accion === 'stock') {
        await ajustarStock(id);
    }

    if (boton.dataset.accion === 'eliminar') {
        await eliminar(id);
    }
}

async function ajustarStock(id) {
    const producto = productos.find(p => p._id === id);
    if (!producto) return;

    const valor = prompt('Nuevo stock para ' + producto.nombre, producto.stock);
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
    if (!confirm('¿Eliminar este producto?')) return;

    try {
        await apiFetch('/productos/' + id, { method: 'DELETE' });
        mostrarAlerta('Producto eliminado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
