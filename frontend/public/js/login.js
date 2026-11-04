const sesion = obtenerUsuario();

if (obtenerToken() && sesion) {
    location.href = sesion.rol === 'admin' ? 'productos.html' : 'tienda.html';
}

document.getElementById('formLogin').addEventListener('submit', async function (evento) {
    evento.preventDefault();

    const boton = evento.target.querySelector('button');
    boton.disabled = true;

    try {
        const respuesta = await fetch(API.BASE + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                correo: document.getElementById('correo').value,
                contrasenna: document.getElementById('contrasenna').value
            })
        });

        const datos = await respuesta.json().catch(() => null);

        if (!respuesta.ok) {
            throw new Error(datos && datos.message ? datos.message : 'No se pudo iniciar sesión');
        }

        guardarSesion(datos.datos);
        location.href = datos.datos.usuario.rol === 'admin' ? 'productos.html' : 'tienda.html';
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
        boton.disabled = false;
    }
});
