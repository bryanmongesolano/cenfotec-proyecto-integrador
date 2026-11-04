function guardarSesion(datos) {
    localStorage.setItem('token', datos.token);
    localStorage.setItem('usuario', JSON.stringify(datos.usuario));
}

function obtenerToken() {
    return localStorage.getItem('token');
}

function obtenerUsuario() {
    try {
        return JSON.parse(localStorage.getItem('usuario'));
    } catch (error) {
        return null;
    }
}

function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    location.href = 'login.html';
}

function requerirAdmin() {
    const usuario = obtenerUsuario();

    if (!obtenerToken() || !usuario || usuario.rol !== 'admin') {
        location.href = 'login.html';
        return false;
    }

    return true;
}

function requerirUsuario() {
    const usuario = obtenerUsuario();

    if (!obtenerToken() || !usuario) {
        location.href = 'login.html';
        return false;
    }

    return true;
}
