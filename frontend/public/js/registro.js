const sesion = obtenerUsuario();

if (obtenerToken() && sesion) {
    location.href = sesion.rol === 'admin' ? 'productos.html' : 'tienda.html';
}

document.getElementById('formRegistro').addEventListener('submit', async function (evento) {
    evento.preventDefault();

    const boton = evento.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        const datos = await apiFetch('/auth/registro', {
            method: 'POST',
            body: JSON.stringify({
                nombre: document.getElementById('nombre').value.trim(),
                apellido: document.getElementById('apellido').value.trim(),
                correo: document.getElementById('correo').value.trim(),
                telefono: document.getElementById('telefono').value.trim(),
                contrasenna: document.getElementById('contrasenna').value
            })
        });

        guardarSesion(datos.datos);
        location.href = 'tienda.html';
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
        boton.disabled = false;
    }
});
