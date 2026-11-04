document.addEventListener('DOMContentLoaded', function () {
    const menu = document.getElementById('menu');

    if (!menu) return;

    const usuario = obtenerUsuario();
    const pagina = location.pathname.split('/').pop() || 'tienda.html';

    const enlaces = [
        ['tienda.html', 'Tienda'],
        ['carrito.html', 'Carrito']
    ];

    if (usuario && usuario.rol === 'admin') {
        enlaces.push(['productos.html', 'Panel admin']);
    }

    const items = enlaces.map(([href, texto]) => `
        <li class="nav-item">
            <a class="nav-link ${pagina === href ? 'active' : ''}" href="${href}">${texto}</a>
        </li>`).join('');

    const sesion = usuario
        ? `<span class="navbar-text me-3">${esc(usuario.nombre)}</span>
           <button class="btn btn-outline-light btn-sm" onclick="cerrarSesion()">Salir</button>`
        : `<a class="btn btn-outline-light btn-sm" href="login.html">Ingresar</a>`;

    menu.innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark navbar-tienda">
            <div class="container">
                <a class="navbar-brand" href="tienda.html">Tienda</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuTienda">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="menuTienda">
                    <ul class="navbar-nav me-auto">${items}</ul>
                    ${sesion}
                </div>
            </div>
        </nav>`;
});
