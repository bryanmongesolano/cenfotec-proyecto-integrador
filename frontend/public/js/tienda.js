let productos = [];
let categorias = [];

iniciar();

async function iniciar() {
    try {
        const [listaProductos, listaCategorias] = await Promise.all([
            apiPublica('/productos?estado=true'),
            apiPublica('/categorias?estado=true')
        ]);

        productos = listaProductos;
        categorias = listaCategorias;

        const select = document.getElementById('categoria');
        select.innerHTML = '<option value="">Todas</option>' +
            categorias.map(c => `<option value="${c._id}">${esc(c.nombre)}</option>`).join('');

        document.getElementById('buscar').addEventListener('input', pintar);
        document.getElementById('categoria').addEventListener('change', pintar);
        document.getElementById('limpiar').addEventListener('click', () => {
            document.getElementById('buscar').value = '';
            document.getElementById('categoria').value = '';
            pintar();
        });

        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintar() {
    const texto = document.getElementById('buscar').value.toLowerCase();
    const categoria = document.getElementById('categoria').value;

    const lista = productos.filter(p => {
        const coincide = (p.nombre || '').toLowerCase().includes(texto);
        const categoriaOk = !categoria || (p.categoria && p.categoria._id === categoria);
        return coincide && categoriaOk;
    });

    const grilla = document.getElementById('grilla');
    const vacio = document.getElementById('vacio');

    if (!lista.length) {
        grilla.innerHTML = '';
        vacio.classList.remove('d-none');
        return;
    }

    vacio.classList.add('d-none');

    grilla.innerHTML = lista.map(p => {
        const imagen = p.imagenes && p.imagenes.length ? p.imagenes[0] : 'img/placeholder.svg';
        const categoriaNombre = p.categoria && p.categoria.nombre ? p.categoria.nombre : 'Sin categoría';
        const agotado = p.stock <= 0;

        return `
            <div class="col-12 col-sm-6 col-md-4 col-lg-3">
                <article class="card h-100 shadow-sm product-card">
                    <img src="${esc(imagen)}" class="card-img-top" alt="${esc(p.nombre)}" />
                    <div class="card-body d-flex flex-column">
                        <span class="badge bg-light text-dark align-self-start mb-2">${esc(categoriaNombre)}</span>
                        <h3 class="h6 mb-1">${esc(p.nombre)}</h3>
                        <p class="text-muted small mb-3">${esc((p.descripcion || '').slice(0, 80))}</p>
                        <div class="mt-auto d-flex justify-content-between align-items-center">
                            <span class="fw-bold">${moneda(p.precio)}</span>
                            ${agotado
                ? '<span class="badge bg-secondary">Agotado</span>'
                : `<a class="btn btn-sm btn-primary" href="producto.html?id=${p._id}">Ver</a>`}
                        </div>
                    </div>
                </article>
            </div>`;
    }).join('');
}
