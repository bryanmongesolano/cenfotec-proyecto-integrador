const parametros = new URLSearchParams(location.search);
const id = parametros.get('id');

let producto = null;

if (id) {
    cargar();
} else {
    mostrarError('Producto no encontrado');
}

async function cargar() {
    try {
        producto = await apiPublica('/productos/' + id);
        pintar();
        cargarResennas();
    } catch (error) {
        mostrarError(error.message);
    }
}

function mostrarError(mensaje) {
    document.getElementById('contenido').innerHTML = `
        <div class="alert alert-warning">
            ${esc(mensaje)}
            <a href="tienda.html" class="alert-link">Volver a la tienda</a>
        </div>`;
}

function pintar() {
    const imagen = producto.imagenes && producto.imagenes.length ? producto.imagenes[0] : 'img/placeholder.svg';
    const categoria = producto.categoria && producto.categoria.nombre ? producto.categoria.nombre : 'Sin categoría';
    const agotado = producto.stock <= 0;

    document.getElementById('contenido').innerHTML = `
        <div class="row g-4">
            <div class="col-12 col-md-6">
                <img src="${esc(imagen)}" class="detail-img" alt="${esc(producto.nombre)}" />
            </div>

            <div class="col-12 col-md-6">
                <span class="badge bg-light text-dark mb-2">${esc(categoria)}</span>
                <h1 class="h3">${esc(producto.nombre)}</h1>
                <p class="text-muted">${esc(producto.descripcion || '')}</p>
                <p class="fs-4 fw-bold mb-2">${moneda(producto.precio)}</p>
                <p class="mb-4">
                    ${agotado
            ? '<span class="badge bg-secondary">Agotado</span>'
            : `<span class="badge bg-success">Disponible: ${producto.stock}</span>`}
                </p>

                <form id="formAgregar" class="row g-2 align-items-end">
                    <div class="col-4 col-md-3">
                        <label class="form-label" for="cantidad">Cantidad</label>
                        <input type="number" class="form-control" id="cantidad" value="1" min="1" max="${producto.stock}" ${agotado ? 'disabled' : ''} />
                    </div>
                    <div class="col-8 col-md-6">
                        <button type="submit" class="btn btn-primary w-100" ${agotado ? 'disabled' : ''}>Agregar al carrito</button>
                    </div>
                </form>
            </div>
        </div>

        <section class="mt-5">
            <h2 class="h4 mb-3">Reseñas</h2>
            <div id="resennas" class="mb-3"></div>
            <div id="zonaResenna"></div>
        </section>`;

    document.getElementById('formAgregar').addEventListener('submit', agregar);
}

async function agregar(evento) {
    evento.preventDefault();

    const usuario = obtenerUsuario();

    if (!usuario) {
        location.href = 'login.html';
        return;
    }

    const cantidad = Number(document.getElementById('cantidad').value);

    try {
        await apiFetch('/carrito/' + usuario._id + '/items', {
            method: 'POST',
            body: JSON.stringify({ producto: producto._id, cantidad })
        });

        mostrarAlerta('Producto agregado al carrito');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function cargarResennas() {
    try {
        const resennas = await apiPublica('/resennas?producto=' + producto._id);
        const contenedor = document.getElementById('resennas');

        if (!resennas.length) {
            contenedor.innerHTML = '<p class="text-muted">Todavía no hay reseñas.</p>';
        } else {
            contenedor.innerHTML = resennas.map(r => `
                <article class="border-bottom py-2">
                    <div>${estrellas(r.calificacion)}</div>
                    <p class="mb-1">${esc(r.comentario)}</p>
                    <small class="text-muted">
                        ${esc(r.usuario ? r.usuario.nombre + ' ' + r.usuario.apellido : 'Cliente')} · ${fecha(r.fecha)}
                    </small>
                </article>`).join('');
        }

        pintarFormularioResenna();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintarFormularioResenna() {
    const contenedor = document.getElementById('zonaResenna');

    if (!obtenerUsuario()) {
        contenedor.innerHTML = '<a href="login.html">Ingresá para dejar una reseña</a>';
        return;
    }

    contenedor.innerHTML = `
        <form id="formResenna" class="card card-body shadow-sm">
            <h3 class="h6">Dejar una reseña</h3>
            <div class="row g-2 align-items-end">
                <div class="col-12 col-md-3">
                    <label class="form-label" for="calificacion">Calificación</label>
                    <select class="form-select" id="calificacion">
                        <option value="5">5 estrellas</option>
                        <option value="4">4 estrellas</option>
                        <option value="3">3 estrellas</option>
                        <option value="2">2 estrellas</option>
                        <option value="1">1 estrella</option>
                    </select>
                </div>
                <div class="col-12 col-md-7">
                    <label class="form-label" for="comentario">Comentario</label>
                    <input type="text" class="form-control" id="comentario" required />
                </div>
                <div class="col-12 col-md-2">
                    <button type="submit" class="btn btn-primary w-100">Publicar</button>
                </div>
            </div>
        </form>`;

    document.getElementById('formResenna').addEventListener('submit', async function (evento) {
        evento.preventDefault();

        try {
            await apiFetch('/resennas', {
                method: 'POST',
                body: JSON.stringify({
                    producto: producto._id,
                    calificacion: Number(document.getElementById('calificacion').value),
                    comentario: document.getElementById('comentario').value.trim()
                })
            });

            document.getElementById('formResenna').reset();
            mostrarAlerta('Reseña publicada');
            cargarResennas();
        } catch (error) {
            mostrarAlerta(error.message, 'danger');
        }
    });
}
