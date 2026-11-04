document.addEventListener('DOMContentLoaded', function () {
    const menu = document.getElementById('menu');

    if (!menu) return;

    const usuario = obtenerUsuario();
    const pagina = location.pathname.split('/').pop() || 'productos.html';

    const enlaces = [
        ['productos.html', 'Productos'],
        ['categorias.html', 'Categorías'],
        ['pedidos.html', 'Pedidos'],
        ['usuarios.html', 'Usuarios'],
        ['resennas.html', 'Reseñas'],
        ['pagos.html', 'Pagos']
    ];

    const items = enlaces.map(([href, texto]) => `
        <li class="nav-item">
            <a class="nav-link ${pagina === href ? 'active' : ''}" href="${href}">${texto}</a>
        </li>`).join('');

    menu.innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark navbar-admin">
            <div class="container-fluid">
                <a class="navbar-brand" href="productos.html">Panel Admin</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menuAdmin">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="menuAdmin">
                    <ul class="navbar-nav me-auto">${items}</ul>
                    <span class="navbar-text text-white me-3">
                        ${usuario ? esc(usuario.nombre + ' ' + usuario.apellido) : ''}
                    </span>
                    <button class="btn btn-outline-light btn-sm" onclick="cerrarSesion()">Salir</button>
                </div>
            </div>
        </nav>`;
});
