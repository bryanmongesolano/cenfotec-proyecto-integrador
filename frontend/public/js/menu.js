document.addEventListener("DOMContentLoaded", function () {

  const menu = document.getElementById("menu");

  if (!menu) return;

  menu.innerHTML = `
      <nav class="navbar navbar-expand-sm navbar-light bg-light">
          <div class="container">
            <a class="navbar-brand" href="index.html">Proyecto Integrador</a>
            <button
              class="navbar-toggler d-lg-none"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#collapsibleNavId"
              aria-controls="collapsibleNavId"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="collapsibleNavId">
              <ul class="navbar-nav me-auto mt-2 mt-lg-0">
                <li class="nav-item">
                  <a class="nav-link" href="index.html">Inicio</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="usuarios.html">Usuarios</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="productos.html">Productos</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="categorias.html">Categorias</a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" href="pedidos.html">Pedidos</a>
                </li>
              </ul>
            </div>
          </div>
        </nav>
    `;

});
