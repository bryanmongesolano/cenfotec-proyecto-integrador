let productos = [];
let categorias = [];
let promediosResennas = new Map();

const IMG_FALLBACK = "onerror=\"this.onerror=null;this.src='img/placeholder.svg';\"";

iniciar();

function truncarTexto(texto, limite) {
    const limpio = String(texto || '').trim();
    if (limpio.length <= limite) return limpio;
    return limpio.slice(0, limite).trimEnd() + '…';
}

window.aplicarBusquedaGlobal = function (texto) {
    const limpio = String(texto || '').trim();
    const url = limpio ? `tienda.html?q=${encodeURIComponent(limpio)}` : 'tienda.html';
    history.pushState(null, '', url);
    renderizarVista();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

async function iniciar() {
    try {
        const [listaProductos, listaCategorias, listaResennas] = await Promise.all([
            apiPublica('/productos?estado=true'),
            apiPublica('/categorias?estado=true'),
            apiPublica('/resennas').catch(() => [])
        ]);

        productos = listaProductos || [];
        categorias = listaCategorias || [];
        calcularPromediosResennas(listaResennas || []);

        document.getElementById('vistaInicio').addEventListener('click', manejarClickTarjeta);
        document.getElementById('vistaResultados').addEventListener('click', manejarClickTarjeta);
        document.getElementById('btnVolverInicio').addEventListener('click', volverAlInicio);
        document.getElementById('btnVolverVacio').addEventListener('click', volverAlInicio);
        window.addEventListener('popstate', renderizarVista);

        renderizarVista();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function volverAlInicio() {
    const navInput = document.getElementById('buscarNav');
    if (navInput) navInput.value = '';
    history.pushState(null, '', 'tienda.html');
    renderizarVista();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function calcularPromediosResennas(resennas) {
    const acum = new Map();

    resennas.forEach(r => {
        const prodId = r.producto && r.producto._id ? r.producto._id : r.producto;
        if (!prodId) return;

        const actual = acum.get(prodId) || { suma: 0, cantidad: 0 };
        actual.suma += Number(r.calificacion) || 0;
        actual.cantidad += 1;
        acum.set(prodId, actual);
    });

    promediosResennas = new Map();
    acum.forEach((v, k) => {
        promediosResennas.set(k, {
            promedio: v.suma / v.cantidad,
            cantidad: v.cantidad
        });
    });
}

function renderizarVista() {
    const params = new URLSearchParams(location.search);
    const q = (params.get('q') || '').trim();
    const categoriaId = (params.get('categoria') || '').trim();
    const verTodos = params.get('ver') === 'todos';

    const navInput = document.getElementById('buscarNav');
    if (navInput) navInput.value = q;

    const esResultados = Boolean(q || categoriaId || verTodos);
    document.getElementById('vistaInicio').classList.toggle('d-none', esResultados);
    document.getElementById('vistaResultados').classList.toggle('d-none', !esResultados);

    if (esResultados) {
        pintarResultados({ q, categoriaId, verTodos });
    } else {
        pintarInicio();
    }
}

function pintarInicio() {
    pintarHero();
    pintarDestacados();
    pintarMejorCalificados();
    pintarNovedades();
    pintarSeccionesCategorias();
}

function pintarHero() {
    const indicadores = document.getElementById('heroIndicadores');
    const slides = document.getElementById('heroSlides');
    const btnPrev = document.getElementById('heroPrev');
    const btnNext = document.getElementById('heroNext');

    const principales = productos.filter(p => p.destacado).slice(0, 4);
    const items = principales.length ? principales : productos.slice(0, 3);

    const ocultarControles = items.length <= 1;
    if (btnPrev) btnPrev.classList.toggle('d-none', ocultarControles);
    if (btnNext) btnNext.classList.toggle('d-none', ocultarControles);

    if (!items.length) {
        indicadores.innerHTML = '';
        slides.innerHTML = `
            <div class="carousel-item active">
                <div class="bg-dark bg-gradient text-white p-5 text-center d-flex flex-column justify-content-center align-items-center">
                    <span class="badge text-bg-warning mb-2 px-3 py-2 rounded-pill">Nueva colección</span>
                    <h1 class="display-5 fw-bold mb-2">Bienvenido a Mundo Trendy</h1>
                    <p class="opacity-75 mb-4">Explorá nuestros productos disponibles con envío a todo el país.</p>
                    <a href="tienda.html?ver=todos" class="btn btn-light btn-lg rounded-pill px-4 fw-semibold">Explorar productos</a>
                </div>
            </div>`;
        return;
    }

    indicadores.innerHTML = ocultarControles ? '' : items.map((p, i) => `
        <button
            type="button"
            data-bs-target="#carruselHero"
            data-bs-slide-to="${i}"
            class="${i === 0 ? 'active' : ''}"
            aria-label="Ver destacado ${i + 1}: ${esc(p.nombre)}"
        ></button>`).join('');

    slides.innerHTML = items.map((p, i) => {
        const imagen = p.imagenes && p.imagenes.length ? p.imagenes[0] : 'img/placeholder.svg';
        const etiqueta = p.destacado ? 'Destacado' : 'Disponible';
        const categoriaNombre = p.categoria && p.categoria.nombre ? p.categoria.nombre : '';

        return `
            <div class="carousel-item ${i === 0 ? 'active' : ''}">
                <div class="bg-dark bg-gradient text-white px-4 px-md-5 py-4 py-md-5">
                    <div class="row g-4 align-items-center mx-md-4">
                        <div class="col-12 col-md-7 text-center text-md-start">
                            <div class="d-flex flex-wrap justify-content-center justify-content-md-start gap-2 mb-3">
                                <span class="badge text-bg-warning rounded-pill px-3 py-2">${etiqueta}</span>
                                ${categoriaNombre ? `<span class="badge bg-white bg-opacity-25 text-white rounded-pill px-3 py-2">${esc(categoriaNombre)}</span>` : ''}
                            </div>
                            <h2 class="display-6 fw-bold mb-2">${esc(p.nombre)}</h2>
                            <p class="opacity-75 mb-4">${esc(truncarTexto(p.descripcion, 140))}</p>
                            <div class="d-flex flex-wrap justify-content-center justify-content-md-start align-items-center gap-3">
                                <span class="fs-3 fw-bold">${moneda(p.precio)}</span>
                                <a href="producto.html?id=${p._id}" class="btn btn-light rounded-pill px-4 fw-semibold">Ver producto</a>
                            </div>
                        </div>
                        <div class="col-12 col-md-5">
                            <a href="producto.html?id=${p._id}" class="hero-product-box bg-white rounded-4 p-3 d-flex align-items-center justify-content-center shadow text-decoration-none">
                                <img src="${esc(imagen)}" ${IMG_FALLBACK} class="hero-product-img" alt="${esc(p.nombre)}" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function pintarDestacados() {
    const bloque = document.getElementById('bloqueDestacados');
    const contenedor = document.getElementById('destacadosSlides');
    const controles = document.getElementById('controlesDestacados');
    const lista = productos.filter(p => p.destacado).slice(0, 9);

    if (!lista.length) {
        bloque.classList.add('d-none');
        return;
    }

    bloque.classList.remove('d-none');

    const grupos = [];
    for (let i = 0; i < lista.length; i += 3) {
        grupos.push(lista.slice(i, i + 3));
    }

    if (controles) {
        controles.classList.toggle('d-none', grupos.length <= 1);
    }

    contenedor.innerHTML = grupos.map((grupo, i) => `
        <div class="carousel-item ${i === 0 ? 'active' : ''}">
            <div class="row g-4">
                ${grupo.map(p => tarjetaProducto(p, 'col-12 col-md-4')).join('')}
            </div>
        </div>`).join('');
}

function pintarMejorCalificados() {
    const bloque = document.getElementById('bloqueMejorCalificados');
    const grilla = document.getElementById('grillaMejorCalificados');

    const conResennas = productos
        .filter(p => promediosResennas.has(p._id))
        .sort((a, b) => {
            const ra = promediosResennas.get(a._id);
            const rb = promediosResennas.get(b._id);
            if (rb.promedio !== ra.promedio) return rb.promedio - ra.promedio;
            return rb.cantidad - ra.cantidad;
        })
        .slice(0, 4);

    if (!conResennas.length) {
        bloque.classList.add('d-none');
        return;
    }

    bloque.classList.remove('d-none');
    grilla.innerHTML = conResennas.map(p => tarjetaProducto(p, 'col-12 col-sm-6 col-md-4 col-lg-3')).join('');
}

function pintarNovedades() {
    const bloque = document.getElementById('bloqueNovedades');
    const grilla = document.getElementById('grillaNovedades');

    const recientes = [...productos]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 4);

    if (!recientes.length) {
        bloque.classList.add('d-none');
        return;
    }

    bloque.classList.remove('d-none');
    grilla.innerHTML = recientes.map(p => tarjetaProducto(p, 'col-12 col-sm-6 col-md-4 col-lg-3')).join('');
}

function pintarSeccionesCategorias() {
    const contenedor = document.getElementById('seccionesCategorias');
    const secciones = categorias
        .map(cat => ({
            categoria: cat,
            items: productos.filter(p => p.categoria && p.categoria._id === cat._id).slice(0, 4)
        }))
        .filter(sec => sec.items.length > 0);

    contenedor.innerHTML = secciones.map(sec => `
        <section class="mb-5">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h2 class="h4 fw-bold mb-0">${esc(sec.categoria.nombre)}</h2>
                    <small class="text-muted">Recomendados en ${esc(sec.categoria.nombre.toLowerCase())}</small>
                </div>
                <a href="tienda.html?categoria=${encodeURIComponent(sec.categoria._id)}" class="btn btn-sm btn-light border">Ver más</a>
            </div>
            <div class="row g-4">
                ${sec.items.map(p => tarjetaProducto(p, 'col-12 col-sm-6 col-md-4 col-lg-3')).join('')}
            </div>
        </section>`).join('');
}

function pintarResultados({ q, categoriaId, verTodos }) {
    const texto = q.toLowerCase();
    const lista = productos.filter(p => {
        const coincideTexto = !texto ||
            (p.nombre || '').toLowerCase().includes(texto) ||
            (p.descripcion || '').toLowerCase().includes(texto) ||
            (p.marca || '').toLowerCase().includes(texto);
        const coincideCat = !categoriaId || (p.categoria && p.categoria._id === categoriaId);
        return coincideTexto && coincideCat;
    });

    const catObj = categoriaId ? categorias.find(c => c._id === categoriaId) : null;
    let titulo = 'Todos los productos';
    if (q && catObj) {
        titulo = `Resultados para "${q}" en ${catObj.nombre}`;
    } else if (q) {
        titulo = `Resultados para "${q}"`;
    } else if (catObj) {
        titulo = catObj.nombre;
    } else if (!verTodos && categoriaId) {
        titulo = 'Categoría';
    }

    document.getElementById('tituloResultados').textContent = titulo;
    document.getElementById('contadorResultados').textContent = `${lista.length} producto${lista.length === 1 ? '' : 's'} encontrado${lista.length === 1 ? '' : 's'}`;

    const grilla = document.getElementById('grillaResultados');
    const vacio = document.getElementById('vacioResultados');

    if (!lista.length) {
        grilla.innerHTML = '';
        vacio.classList.remove('d-none');
        return;
    }

    vacio.classList.add('d-none');
    grilla.innerHTML = lista.map(p => tarjetaProducto(p, 'col-12 col-sm-6 col-md-4 col-lg-3')).join('');
}

function tarjetaProducto(p, columna) {
    const imagen = p.imagenes && p.imagenes.length ? p.imagenes[0] : 'img/placeholder.svg';
    const agotado = p.stock <= 0;
    const rating = promediosResennas.get(p._id);
    const fav = esFavorito(p._id);

    return `
        <div class="${columna}">
            <article class="card h-100 border-0 shadow-sm product-card overflow-hidden position-relative">
                <div class="position-relative bg-white border-bottom">
                    <img src="${esc(imagen)}" ${IMG_FALLBACK} class="card-img-top" alt="${esc(p.nombre)}" />
                    <div class="position-absolute top-0 start-0 p-2">
                        ${p.destacado ? '<span class="badge text-bg-warning text-dark rounded-circle d-inline-flex align-items-center justify-content-center shadow-sm" style="width: 30px; height: 30px;" title="Destacado" aria-label="Destacado"><i class="bi bi-star-fill"></i></span>' : ''}
                    </div>
                    <div class="position-absolute top-0 end-0 p-2 z-2">
                        <button type="button" class="btn btn-sm rounded-circle shadow-sm border ${fav ? 'btn-danger' : 'btn-light text-secondary'}" style="width: 34px; height: 34px;" data-fav="${p._id}" title="${fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}" aria-label="Favorito">
                            <i class="bi bi-heart${fav ? '-fill' : ''}"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body d-flex flex-column">
                    ${p.marca ? `<div class="mb-1"><small class="text-muted text-uppercase fw-semibold" style="font-size: 0.72rem; letter-spacing: 0.04em;">${esc(p.marca)}</small></div>` : ''}
                    <h3 class="h6 fw-bold mb-1">
                        <a href="producto.html?id=${p._id}" class="text-decoration-none text-dark stretched-link">${esc(p.nombre)}</a>
                    </h3>
                    ${rating ? `<div class="small mb-1">${estrellas(rating.promedio)} <span class="text-muted">${rating.promedio.toFixed(1)} (${rating.cantidad})</span></div>` : ''}
                    <p class="text-muted small mb-3">${esc(truncarTexto(p.descripcion, 72))}</p>
                    <div class="mt-auto d-flex justify-content-between align-items-center">
                        <span class="fs-5 fw-bold text-primary tabular-nums">${moneda(p.precio)}</span>
                        ${agotado ? '<span class="badge bg-secondary-subtle text-secondary">Agotado</span>' : ''}
                    </div>
                </div>
            </article>
        </div>`;
}

function manejarClickTarjeta(evento) {
    const btnFav = evento.target.closest('button[data-fav]');
    if (!btnFav) return;

    evento.preventDefault();
    evento.stopPropagation();

    const id = btnFav.dataset.fav;
    const agregado = alternarFavorito(id);
    mostrarAlerta(agregado ? 'Agregado a tus favoritos' : 'Quitado de favoritos', 'info');
    renderizarVista();
}
