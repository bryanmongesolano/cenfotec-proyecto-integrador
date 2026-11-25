const sesion = obtenerUsuario();

if (obtenerToken() && sesion) {
    location.href = obtenerDestinoPostLogin(sesion);
}

const linkLogin = document.querySelector('a[href="login.html"]');
if (linkLogin && location.search) {
    linkLogin.href = 'login.html' + location.search;
}

const inputClave = document.getElementById('contrasenna');
if (inputClave) {
    const niveles = [
        { clase: '', texto: 'Mínimo 6 caracteres' },
        { clase: 'bg-danger', texto: 'Contraseña débil' },
        { clase: 'bg-warning', texto: 'Contraseña aceptable' },
        { clase: 'bg-info', texto: 'Contraseña buena' },
        { clase: 'bg-success', texto: 'Contraseña muy segura' }
    ];

    inputClave.addEventListener('input', () => {
        const val = inputClave.value || '';
        let nivel = 0;
        if (val.length >= 6) nivel++;
        if (val.length >= 10) nivel++;
        if (/[A-Z]/.test(val) && /[a-z]/.test(val)) nivel++;
        if (/[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val)) nivel++;

        const barra = document.getElementById('barraFuerzaClave');
        barra.style.width = (nivel * 25) + '%';
        barra.className = ('progress-bar ' + niveles[nivel].clase).trim();
        document.getElementById('textoFuerzaClave').textContent = niveles[nivel].texto;
    });
}

document.getElementById('formRegistro').addEventListener('submit', async function (evento) {
    evento.preventDefault();

    const contrasenna = document.getElementById('contrasenna').value;
    if (contrasenna !== document.getElementById('confirmarContrasenna').value) {
        mostrarAlerta('Las contraseñas no coinciden', 'warning');
        return;
    }

    const boton = evento.target.querySelector('button[type="submit"]');
    boton.disabled = true;

    const cuerpo = {
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellido').value.trim(),
        correo: document.getElementById('correo').value.trim(),
        contrasenna
    };

    const telefono = document.getElementById('telefono').value.trim();
    if (telefono) cuerpo.telefono = telefono;

    try {
        const datos = await apiFetch('/auth/registro', {
            method: 'POST',
            body: JSON.stringify(cuerpo)
        });

        guardarSesion(datos.datos);
        await sincronizarCarritoInvitado(datos.datos.usuario);
        location.href = obtenerDestinoPostLogin(datos.datos.usuario);
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
        boton.disabled = false;
    }
});
