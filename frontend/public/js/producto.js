const parametros = new URLSearchParams(location.search);
const id = parametros.get('id');
const IMG_FALLBACK = "onerror=\"this.onerror=null;this.src='img/placeholder.svg';\"";

let producto = null;
let resennasLista = [];
let resennaEditandoId = null;
let calificacionSeleccionada = 5;

if (id) {
    cargar();
} else {
    mostrarError('Producto no encontrado');
}

async function cargar() {
    try {
        producto = await apiPublica('/productos/' + id);
        document.title = producto.nombre + ' - Mundo Trendy';
        registrarProductoVisto(producto._id);
        pintar();
        cargarResennas();
        cargarRelacionados();
        cargarRecientes();
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
    const imagenes = producto.imagenes && producto.imagenes.length ? producto.imagenes : ['img/placeholder.svg'];
    const categoriaId = producto.categoria && producto.categoria._id ? producto.categoria._id : '';
    const categoria = producto.categoria && producto.categoria.nombre ? producto.categoria.nombre : 'Sin categoría';
    const urlCategoria = categoriaId ? `tienda.html?categoria=${encodeURIComponent(categoriaId)}` : 'tienda.html?ver=todos';
    const inactivo = producto.estado === false;
    const agotado = producto.stock <= 0;
    const noDisponible = inactivo || agotado;
    const fav = esFavorito(producto._id);

    const controlesCarrusel = imagenes.length > 1 ? `
        <div class="carousel-indicators">
            ${imagenes.map((_, i) => `
                <button
                    type="button"
                    data-bs-target="#carruselProducto"
                    data-bs-slide-to="${i}"
                    class="${i === 0 ? 'active' : ''}"
                    aria-label="Ver imagen ${i + 1}"
                ></button>`).join('')}
        </div>
        <button class="carousel-control-prev" type="button" data-bs-target="#carruselProducto" data-bs-slide="prev" aria-label="Imagen anterior">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Anterior</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#carruselProducto" data-bs-slide="next" aria-label="Siguiente imagen">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
            <span class="visually-hidden">Siguiente</span>
        </button>` : '';

    const miniaturas = imagenes.length > 1 ? `
        <div class="d-flex flex-wrap gap-2 mt-3" id="miniaturasProducto">
            ${imagenes.map((img, i) => `
                <button
                    type="button"
                    class="p-0 border-0 bg-transparent"
                    data-bs-target="#carruselProducto"
                    data-bs-slide-to="${i}"
                    aria-label="Seleccionar imagen ${i + 1}"
                >
                    <img src="${esc(img)}" ${IMG_FALLBACK} class="detail-thumb rounded border border-2 ${i === 0 ? 'border-primary' : 'border-light-subtle'}" data-thumb-index="${i}" alt="Miniatura ${i + 1}" />
                </button>`).join('')}
        </div>` : '';

    const descCompleta = String(producto.descripcion || '').trim();
    const descLarga = descCompleta.length > 180;
    const descResumen = descLarga ? descCompleta.slice(0, 180).trimEnd() + '…' : descCompleta;

    let badgeStock = '';
    if (inactivo) {
        badgeStock = '<div class="mb-4"><span class="badge bg-danger px-3 py-2 rounded-pill">No disponible</span></div>';
    } else if (agotado) {
        badgeStock = '<div class="mb-4"><span class="badge bg-secondary px-3 py-2 rounded-pill">Agotado</span></div>';
    }

    document.getElementById('contenido').innerHTML = `
        <nav aria-label="breadcrumb" class="mb-4">
            <ol class="breadcrumb small">
                <li class="breadcrumb-item"><a href="tienda.html">Inicio</a></li>
                <li class="breadcrumb-item">${categoriaId ? `<a href="${urlCategoria}">${esc(categoria)}</a>` : esc(categoria)}</li>
                <li class="breadcrumb-item active" aria-current="page">${esc(producto.nombre)}</li>
            </ol>
        </nav>

        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body p-3 p-md-4">
                <div class="row g-4 align-items-start">
                    <div class="col-12 col-md-6">
                        <div id="carruselProducto" class="carousel carousel-dark slide rounded-4 overflow-hidden border bg-white">
                            <div class="carousel-inner">
                                ${imagenes.map((img, i) => `
                                    <div class="carousel-item ${i === 0 ? 'active' : ''}">
                                        <img src="${esc(img)}" ${IMG_FALLBACK} class="d-block w-100 detail-carousel-img" alt="${esc(producto.nombre)}" />
                                    </div>`).join('')}
                            </div>
                            ${controlesCarrusel}
                        </div>
                        ${miniaturas}
                    </div>

                    <div class="col-12 col-md-6">
                        <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
                            <h1 class="h2 fw-bold mb-0">${esc(producto.nombre)}</h1>
                            <button type="button" class="btn btn-sm ${fav ? 'btn-danger' : 'btn-outline-danger'} rounded-pill flex-shrink-0" id="btnFavDetalle" title="Favorito">
                                <i class="bi bi-heart${fav ? '-fill' : ''}"></i>
                            </button>
                        </div>

                        <div id="ratingHeader" class="mb-2"></div>

                        <div class="d-flex flex-wrap gap-3 text-muted small mb-3">
                            ${producto.marca ? `<span>Marca: <strong class="text-dark">${esc(producto.marca)}</strong></span>` : ''}
                            ${producto.sku ? `<span>SKU: <strong class="text-dark">${esc(producto.sku)}</strong></span>` : ''}
                        </div>

                        ${descResumen ? `<p class="text-muted mb-3">${esc(descResumen)}${descLarga ? ' <a href="#tabsProducto" id="verMasDesc" class="text-decoration-none small">Ver descripción completa</a>' : ''}</p>` : ''}

                        <div class="display-6 fw-bold text-primary mb-2 tabular-nums">${moneda(producto.precio)}</div>
                        <div class="small text-muted mb-4">
                            ${producto.precio >= 50000
                                ? '<i class="bi bi-truck text-success me-1"></i><span class="text-success fw-semibold">Califica para envío estándar gratis</span>'
                                : '<i class="bi bi-truck text-primary me-1"></i>Envío estándar gratis en pedidos desde ₡50 000'}
                        </div>

                        ${badgeStock}

                        <form id="formAgregar" class="row g-2 align-items-end">
                            <div class="col-5 col-sm-4">
                                <label class="form-label small text-muted" for="cantidad">Cantidad</label>
                                <div class="input-group">
                                    <button type="button" class="btn btn-outline-secondary" id="btnMenosCant" aria-label="Disminuir cantidad" ${noDisponible ? 'disabled' : ''}>−</button>
                                    <input
                                        type="number"
                                        class="form-control text-center"
                                        id="cantidad"
                                        value="1"
                                        min="1"
                                        max="${Math.max(1, producto.stock || 0)}"
                                        ${noDisponible ? 'disabled' : ''}
                                    />
                                    <button type="button" class="btn btn-outline-secondary" id="btnMasCant" aria-label="Aumentar cantidad" ${noDisponible ? 'disabled' : ''}>+</button>
                                </div>
                            </div>
                            <div class="col-7 col-sm-8">
                                <button type="submit" id="btnAgregarDetalle" class="btn btn-primary w-100 fw-semibold" ${noDisponible ? 'disabled' : ''}>
                                    <i class="bi bi-cart-plus me-1" aria-hidden="true"></i>${inactivo ? 'No disponible' : agotado ? 'Agotado' : 'Agregar al carrito'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <section id="tabsProducto" class="card border-0 shadow-sm mb-5">
            <div class="card-header bg-white">
                <ul class="nav nav-tabs card-header-tabs" role="tablist">
                    <li class="nav-item">
                        <button class="nav-link active fw-semibold" id="btnTabDetalles" data-bs-toggle="tab" data-bs-target="#tabDetalles" type="button" role="tab">
                            Especificaciones
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link fw-semibold" id="btnTabResennas" data-bs-toggle="tab" data-bs-target="#tabResennas" type="button" role="tab">
                            Reseñas <span class="badge bg-primary rounded-pill ms-1" id="totalResennas">0</span>
                        </button>
                    </li>
                </ul>
            </div>

            <div class="card-body tab-content p-4">
                <div class="tab-pane fade show active" id="tabDetalles" role="tabpanel">
                    ${descLarga ? `<p class="mb-4">${esc(descCompleta)}</p>` : ''}
                    <div class="table-responsive">
                        <table class="table table-sm mb-0" style="max-width: 580px">
                            <tbody>
                                <tr>
                                    <th class="text-muted fw-normal" style="width: 35%">Categoría</th>
                                    <td>${categoriaId ? `<a href="${urlCategoria}" class="text-decoration-none">${esc(categoria)}</a>` : esc(categoria)}</td>
                                </tr>
                                <tr>
                                    <th class="text-muted fw-normal">Marca</th>
                                    <td>${esc(producto.marca || '—')}</td>
                                </tr>
                                <tr>
                                    <th class="text-muted fw-normal">SKU</th>
                                    <td>${esc(producto.sku || '—')}</td>
                                </tr>
                                <tr>
                                    <th class="text-muted fw-normal">Disponibilidad</th>
                                    <td>${inactivo ? 'No disponible' : agotado ? 'Agotado' : `${producto.stock} unidad(es) en inventario`}</td>
                                </tr>
                                <tr>
                                    <th class="text-muted fw-normal">Entrega</th>
                                    <td>Envío estándar (₡1 500 o gratis +₡50 000), express (₡3 000) o retiro gratis en tienda</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="tab-pane fade" id="tabResennas" role="tabpanel">
                    <div id="resumenResennas" class="mb-4"></div>
                    <div id="resennas" class="list-group list-group-flush mb-4"></div>
                    <div id="zonaResenna"></div>
                </div>
            </div>
        </section>

        <section id="bloqueRelacionados" class="mb-5 d-none">
            <h2 class="h4 fw-bold mb-3">También te puede interesar</h2>
            <div class="row g-3" id="relacionados"></div>
        </section>

        <section id="bloqueRecientes" class="d-none">
            <h2 class="h5 fw-bold mb-3 text-muted">Vistos recientemente</h2>
            <div class="row g-3" id="recientes"></div>
        </section>`;

    const carruselEl = document.getElementById('carruselProducto');
    if (carruselEl && imagenes.length > 1) {
        carruselEl.addEventListener('slid.bs.carousel', (ev) => {
            document.querySelectorAll('#miniaturasProducto .detail-thumb').forEach(img => {
                const activa = Number(img.dataset.thumbIndex) === ev.to;
                img.classList.toggle('border-primary', activa);
                img.classList.toggle('border-light-subtle', !activa);
            });
        });
    }

    document.getElementById('btnFavDetalle').addEventListener('click', (ev) => {
        const agregado = alternarFavorito(producto._id);
        const btn = ev.currentTarget;
        btn.className = `btn btn-sm ${agregado ? 'btn-danger' : 'btn-outline-danger'} rounded-pill flex-shrink-0`;
        btn.innerHTML = `<i class="bi bi-heart${agregado ? '-fill' : ''}"></i>`;
        mostrarAlerta(agregado ? 'Agregado a favoritos' : 'Quitado de favoritos', 'info');
    });

    const verMasDesc = document.getElementById('verMasDesc');
    if (verMasDesc) {
        verMasDesc.addEventListener('click', (ev) => {
            ev.preventDefault();
            bootstrap.Tab.getOrCreateInstance(document.getElementById('btnTabDetalles')).show();
            document.getElementById('tabsProducto').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    document.getElementById('formAgregar').addEventListener('submit', agregar);

    const inputCantidad = document.getElementById('cantidad');
    inputCantidad.addEventListener('change', () => {
        let v = Math.floor(Number(inputCantidad.value));
        if (!Number.isFinite(v) || v < 1) v = 1;
        if (producto.stock > 0 && v > producto.stock) v = producto.stock;
        inputCantidad.value = v;
    });

    document.getElementById('btnMenosCant').addEventListener('click', () => {
        const v = Number(inputCantidad.value) || 1;
        if (v > 1) inputCantidad.value = v - 1;
    });

    document.getElementById('btnMasCant').addEventListener('click', () => {
        const v = Number(inputCantidad.value) || 1;
        if (v < producto.stock) inputCantidad.value = v + 1;
    });
}

async function agregar(evento) {
    evento.preventDefault();

    if (producto.estado === false || producto.stock <= 0) {
        mostrarAlerta('Este producto no está disponible en este momento', 'warning');
        return;
    }

    const cantidad = Math.floor(Number(document.getElementById('cantidad').value));
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > producto.stock) {
        mostrarAlerta(`Ingresá una cantidad válida entre 1 y ${producto.stock}`, 'warning');
        return;
    }

    const usuario = obtenerUsuario();

    if (!usuario || !obtenerToken()) {
        const res = agregarCarritoInvitado(producto._id, cantidad, producto.stock);
        if (!res.ok) {
            mostrarAlerta(res.mensaje, 'warning');
            return;
        }
        if (typeof actualizarBadgeCarrito === 'function') {
            actualizarBadgeCarrito();
        }
        mostrarAlerta('Producto agregado al carrito');
        return;
    }

    const boton = document.getElementById('btnAgregarDetalle');
    boton.disabled = true;

    try {
        const res = await apiFetch('/carrito/' + usuario._id + '/items', {
            method: 'POST',
            body: JSON.stringify({ producto: producto._id, cantidad })
        });

        if (typeof actualizarBadgeCarrito === 'function') {
            actualizarBadgeCarrito(res.datos);
        }
        mostrarAlerta('Producto agregado al carrito');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    } finally {
        if (producto.estado !== false && producto.stock > 0) {
            boton.disabled = false;
        }
    }
}

function irATabResennas() {
    const tabBtn = document.getElementById('btnTabResennas');
    if (tabBtn) {
        bootstrap.Tab.getOrCreateInstance(tabBtn).show();
    }
    const seccion = document.getElementById('tabsProducto');
    if (seccion) {
        seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function cargarResennas() {
    try {
        const resennas = await apiPublica('/resennas?producto=' + producto._id);
        resennasLista = resennas || [];
        const usuario = obtenerUsuario();
        const contenedor = document.getElementById('resennas');
        const resumen = document.getElementById('resumenResennas');
        const ratingHeader = document.getElementById('ratingHeader');
        document.getElementById('totalResennas').textContent = resennasLista.length;

        if (!resennasLista.length) {
            resumen.innerHTML = '';
            if (ratingHeader) {
                ratingHeader.innerHTML = `
                    <button type="button" class="btn btn-link btn-sm p-0 text-muted text-decoration-none" onclick="irATabResennas()">
                        Sin reseñas aún · Sé el primero en opinar
                    </button>`;
            }
            contenedor.innerHTML = '<p class="text-muted mb-0">Todavía no hay reseñas para este producto.</p>';
        } else {
            const suma = resennasLista.reduce((acc, r) => acc + (Number(r.calificacion) || 0), 0);
            const promedio = (suma / resennasLista.length).toFixed(1);

            if (ratingHeader) {
                ratingHeader.innerHTML = `
                    <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none d-inline-flex align-items-center gap-1" onclick="irATabResennas()">
                        <span>${estrellas(Math.round(promedio))}</span>
                        <span class="fw-bold text-dark">${promedio}</span>
                        <span class="text-muted">(${resennasLista.length} reseña${resennasLista.length === 1 ? '' : 's'})</span>
                    </button>`;
            }

            const barras = [5, 4, 3, 2, 1].map(n => {
                const count = resennasLista.filter(r => Number(r.calificacion) === n).length;
                const pct = Math.round((count / resennasLista.length) * 100);
                return `
                    <div class="d-flex align-items-center gap-2 small mb-1">
                        <span style="width: 34px;" class="text-muted">${n} ★</span>
                        <div class="progress flex-grow-1" style="height: 8px;">
                            <div class="progress-bar bg-warning" style="width: ${pct}%"></div>
                        </div>
                        <span style="width: 32px;" class="text-end text-muted">${count}</span>
                    </div>`;
            }).join('');

            resumen.innerHTML = `
                <div class="row g-3 align-items-center bg-light rounded-3 p-3 border">
                    <div class="col-12 col-md-4 text-center">
                        <div class="display-5 fw-bold">${promedio}</div>
                        <div class="fs-5">${estrellas(Math.round(promedio))}</div>
                        <div class="text-muted small">${resennasLista.length} opinión(es) verificada(s)</div>
                    </div>
                    <div class="col-12 col-md-8">${barras}</div>
                </div>`;

            contenedor.innerHTML = resennasLista.map(r => {
                const autorId = r.usuario && r.usuario._id ? r.usuario._id : r.usuario;
                const esMia = usuario && String(autorId) === String(usuario._id);
                const autorNombre = r.usuario ? r.usuario.nombre + ' ' + r.usuario.apellido : 'Cliente';

                return `
                    <article class="list-group-item px-0 py-3">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <div class="d-flex align-items-center gap-2">
                                <span class="rounded-circle bg-primary text-white fw-bold d-inline-flex align-items-center justify-content-center flex-shrink-0" style="width: 28px; height: 28px; font-size: 0.7rem;">${esc(inicialesUsuario(r.usuario ? r.usuario.nombre : 'C', r.usuario ? r.usuario.apellido : ''))}</span>
                                <span class="fw-semibold small">${esc(autorNombre)}</span>
                                <span>${estrellas(r.calificacion)}</span>
                            </div>
                            <div class="d-flex align-items-center gap-3">
                                <small class="text-muted">${fechaCorta(r.fecha)}</small>
                                ${esMia ? `
                                    <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none" onclick="editarMiResenna('${r._id}')">Editar</button>
                                    <button type="button" class="btn btn-link btn-sm p-0 text-danger text-decoration-none" onclick="eliminarMiResenna('${r._id}')">Eliminar</button>
                                ` : ''}
                            </div>
                        </div>
                        <p class="mb-0 mt-1 text-secondary">${esc(r.comentario)}</p>
                    </article>`;
            }).join('');
        }

        pintarFormularioResenna();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function editarMiResenna(resennaId) {
    const resenna = resennasLista.find(r => r._id === resennaId);
    if (!resenna) return;

    resennaEditandoId = resennaId;
    pintarFormularioResenna(resenna);
    document.getElementById('comentario').focus();
}

function cancelarEdicionResenna() {
    resennaEditandoId = null;
    pintarFormularioResenna();
}

async function eliminarMiResenna(resennaId) {
    const confirmado = await confirmarAccion({
        titulo: 'Eliminar reseña',
        mensaje: '¿Deseás eliminar tu reseña de este producto?',
        textoConfirmar: 'Eliminar'
    });
    if (!confirmado) return;

    try {
        await apiFetch('/resennas/' + resennaId, { method: 'DELETE' });
        if (resennaEditandoId === resennaId) {
            resennaEditandoId = null;
        }
        mostrarAlerta('Reseña eliminada');
        cargarResennas();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintarEstrellasPicker() {
    document.querySelectorAll('#pickerEstrellas button').forEach(btn => {
        const val = Number(btn.dataset.val);
        const activa = val <= calificacionSeleccionada;
        btn.classList.toggle('text-warning', activa);
        btn.classList.toggle('text-secondary', !activa);
        btn.classList.toggle('opacity-25', !activa);
    });
    const texto = document.getElementById('textoCalifPicker');
    if (texto) texto.textContent = `${calificacionSeleccionada} de 5 estrellas`;
}

function pintarFormularioResenna(resennaEditar = null) {
    const contenedor = document.getElementById('zonaResenna');

    if (!obtenerUsuario() || !obtenerToken()) {
        contenedor.innerHTML = `<a href="${urlLoginConRetorno()}" class="btn btn-outline-primary btn-sm">Ingresá para dejar una reseña</a>`;
        return;
    }

    const editando = Boolean(resennaEditar);
    calificacionSeleccionada = editando ? Number(resennaEditar.calificacion) : 5;
    const textoActual = editando ? resennaEditar.comentario || '' : '';

    contenedor.innerHTML = `
        <form id="formResenna" class="card card-body bg-light border">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="h6 fw-bold mb-0">${editando ? 'Editar mi reseña' : 'Escribí tu reseña'}</h3>
                ${editando ? '<button type="button" class="btn btn-sm btn-link text-secondary p-0" onclick="cancelarEdicionResenna()">Cancelar edición</button>' : ''}
            </div>
            <div class="row g-3">
                <div class="col-12">
                    <label class="form-label small d-block mb-1">Tu calificación</label>
                    <div class="d-flex align-items-center gap-2">
                        <div id="pickerEstrellas" class="d-inline-flex gap-1">
                            ${[1, 2, 3, 4, 5].map(n => `
                                <button type="button" class="btn btn-link p-0 fs-4 lh-1 text-decoration-none" data-val="${n}" aria-label="${n} estrellas">★</button>`).join('')}
                        </div>
                        <span class="small text-muted fw-medium" id="textoCalifPicker"></span>
                    </div>
                </div>
                <div class="col-12">
                    <label class="form-label small" for="comentario">Comentario</label>
                    <textarea class="form-control" id="comentario" rows="3" placeholder="Contanos tu experiencia con este producto..." required>${esc(textoActual)}</textarea>
                </div>
                <div class="col-12">
                    <button type="submit" class="btn btn-primary btn-sm px-4">${editando ? 'Guardar cambios' : 'Publicar reseña'}</button>
                </div>
            </div>
        </form>`;

    pintarEstrellasPicker();
    document.getElementById('pickerEstrellas').addEventListener('click', (ev) => {
        const btn = ev.target.closest('button[data-val]');
        if (!btn) return;
        calificacionSeleccionada = Number(btn.dataset.val);
        pintarEstrellasPicker();
    });

    document.getElementById('formResenna').addEventListener('submit', async function (evento) {
        evento.preventDefault();

        const cuerpo = {
            producto: producto._id,
            calificacion: calificacionSeleccionada,
            comentario: document.getElementById('comentario').value.trim()
        };

        if (!cuerpo.comentario) {
            mostrarAlerta('Escribí un comentario antes de publicar', 'warning');
            return;
        }

        const btnSubmit = evento.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;

        try {
            if (resennaEditandoId) {
                await apiFetch('/resennas/' + resennaEditandoId, {
                    method: 'PUT',
                    body: JSON.stringify(cuerpo)
                });
                resennaEditandoId = null;
                mostrarAlerta('Reseña actualizada');
            } else {
                await apiFetch('/resennas', {
                    method: 'POST',
                    body: JSON.stringify(cuerpo)
                });
                mostrarAlerta('Reseña publicada');
            }

            cargarResennas();
        } catch (error) {
            mostrarAlerta(error.message, 'danger');
            btnSubmit.disabled = false;
        }
    });
}

function tarjetaMiniProducto(p) {
    const imagen = p.imagenes && p.imagenes.length ? p.imagenes[0] : 'img/placeholder.svg';
    return `
        <div class="col-12 col-sm-6 col-md-3">
            <article class="card h-100 shadow-sm product-card">
                <a href="producto.html?id=${p._id}">
                    <img src="${esc(imagen)}" ${IMG_FALLBACK} class="card-img-top" alt="${esc(p.nombre)}" />
                </a>
                <div class="card-body d-flex flex-column">
                    <h3 class="h6 fw-semibold mb-1">
                        <a href="producto.html?id=${p._id}" class="text-decoration-none text-dark">${esc(p.nombre)}</a>
                    </h3>
                    <div class="mt-auto d-flex justify-content-between align-items-center pt-2">
                        <span class="fw-bold text-primary tabular-nums">${moneda(p.precio)}</span>
                        <a href="producto.html?id=${p._id}" class="btn btn-sm btn-outline-primary">Ver</a>
                    </div>
                </div>
            </article>
        </div>`;
}

async function cargarRelacionados() {
    if (!producto.categoria || !producto.categoria._id) return;

    try {
        const lista = await apiPublica('/productos?estado=true&categoria=' + producto.categoria._id, { silencioso: true });
        const otros = (lista || []).filter(p => p._id !== producto._id).slice(0, 4);

        if (!otros.length) return;

        document.getElementById('bloqueRelacionados').classList.remove('d-none');
        document.getElementById('relacionados').innerHTML = otros.map(tarjetaMiniProducto).join('');
    } catch (error) {
    }
}

async function cargarRecientes() {
    const ids = obtenerProductosVistos().filter(x => x !== String(producto._id)).slice(0, 4);
    if (!ids.length) return;

    try {
        const todos = await apiPublica('/productos?estado=true', { silencioso: true });
        const mapa = new Map((todos || []).map(p => [p._id, p]));
        const lista = ids.map(x => mapa.get(x)).filter(Boolean);
        if (!lista.length) return;

        document.getElementById('bloqueRecientes').classList.remove('d-none');
        document.getElementById('recientes').innerHTML = lista.map(tarjetaMiniProducto).join('');
    } catch (error) {
    }
}
