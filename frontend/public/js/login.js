const sesion = obtenerUsuario();

if (obtenerToken() && sesion) {
    location.href = obtenerDestinoPostLogin(sesion);
}

const linkRegistro = document.getElementById('linkRegistro');
if (linkRegistro && location.search) {
    linkRegistro.href = 'registro.html' + location.search;
}

if (new URLSearchParams(location.search).get('expirada') === '1') {
    mostrarAlerta('Tu sesión expiró. Iniciá sesión nuevamente.', 'warning');
}

document.getElementById('formLogin').addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const boton = evento.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        const datos = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                correo: document.getElementById('correo').value.trim(),
                contrasenna: document.getElementById('contrasenna').value
            })
        });

        guardarSesion(datos.datos);
        await sincronizarCarritoInvitado(datos.datos.usuario);
        location.href = obtenerDestinoPostLogin(datos.datos.usuario);
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
        boton.disabled = false;
    }
});

document.getElementById('formSolicitarToken').addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const correo = document.getElementById('recCorreo').value.trim();
    const boton = evento.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        const datos = await apiFetch('/auth/recuperar', {
            method: 'POST',
            body: JSON.stringify({ correo })
        });

        const token = datos && datos.datos ? datos.datos.token : '';
        document.getElementById('tokenGenerado').textContent = token;
        document.getElementById('avisoToken').classList.remove('d-none');
        document.getElementById('recToken').value = token;
        document.getElementById('formRestablecer').classList.remove('d-none');
        mostrarAlerta('Código de recuperación generado');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    } finally {
        boton.disabled = false;
    }
});

document.getElementById('formRestablecer').addEventListener('submit', async function (evento) {
    evento.preventDefault();
    const correo = document.getElementById('recCorreo').value.trim();
    const token = document.getElementById('recToken').value.trim();
    const contrasenna = document.getElementById('recContrasenna').value;
    const boton = evento.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
        await apiFetch('/auth/restablecer', {
            method: 'POST',
            body: JSON.stringify({ correo, token, contrasenna })
        });

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalRecuperar')).hide();
        document.getElementById('correo').value = correo;
        document.getElementById('contrasenna').value = '';
        document.getElementById('formSolicitarToken').reset();
        document.getElementById('formRestablecer').reset();
        document.getElementById('formRestablecer').classList.add('d-none');
        document.getElementById('avisoToken').classList.add('d-none');
        mostrarAlerta('Contraseña restablecida. Ya podés iniciar sesión.');
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    } finally {
        boton.disabled = false;
    }
});
