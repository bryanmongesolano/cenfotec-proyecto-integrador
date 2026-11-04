let usuarios = [];
let modal = null;

if (requerirAdmin()) {
    modal = new bootstrap.Modal(document.getElementById('modalUsuario'));
    cargar();

    document.getElementById('formUsuario').addEventListener('submit', guardar);
    document.getElementById('tabla').addEventListener('click', manejarAccion);
}

async function cargar() {
    try {
        usuarios = await apiFetch('/usuarios');
        pintar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

function pintar() {
    const tabla = document.getElementById('tabla');

    if (!usuarios.length) {
        tabla.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Sin usuarios</td></tr>';
        return;
    }

    tabla.innerHTML = usuarios.map(u => `
        <tr>
            <td>${esc(u.nombre + ' ' + u.apellido)}</td>
            <td>${esc(u.correo)}</td>
            <td>${esc(u.cedula || '—')}</td>
            <td>${esc(u.telefono || '—')}</td>
            <td><span class="badge bg-${u.rol === 'admin' ? 'dark' : 'secondary'}">${esc(u.rol)}</span></td>
            <td>${badgeActivo(u.estado)}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary" data-accion="editar" data-id="${u._id}">Editar</button>
                <button class="btn btn-sm btn-outline-danger" data-accion="eliminar" data-id="${u._id}">Eliminar</button>
            </td>
        </tr>`).join('');
}

function manejarAccion(evento) {
    const boton = evento.target.closest('button[data-accion]');
    if (!boton) return;

    const id = boton.dataset.id;

    if (boton.dataset.accion === 'editar') {
        abrirEditar(id);
    }

    if (boton.dataset.accion === 'eliminar') {
        eliminar(id);
    }
}

function abrirEditar(id) {
    const usuario = usuarios.find(u => u._id === id);
    if (!usuario) return;

    document.getElementById('id').value = usuario._id;
    document.getElementById('nombre').value = usuario.nombre || '';
    document.getElementById('apellido').value = usuario.apellido || '';
    document.getElementById('apellido2').value = usuario.apellido2 || '';
    document.getElementById('telefono').value = usuario.telefono || '';
    document.getElementById('rol').value = usuario.rol;
    document.getElementById('estado').value = String(usuario.estado);

    modal.show();
}

async function guardar(evento) {
    evento.preventDefault();

    const id = document.getElementById('id').value;

    const cuerpo = {
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellido').value.trim(),
        apellido2: document.getElementById('apellido2').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        rol: document.getElementById('rol').value,
        estado: document.getElementById('estado').value === 'true'
    };

    try {
        await apiFetch('/usuarios/' + id, { method: 'PUT', body: JSON.stringify(cuerpo) });
        modal.hide();
        mostrarAlerta('Usuario actualizado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

async function eliminar(id) {
    const actual = obtenerUsuario();

    if (actual && actual._id === id) {
        mostrarAlerta('No podés eliminar tu propio usuario', 'warning');
        return;
    }

    if (!confirm('¿Eliminar este usuario?')) return;

    try {
        await apiFetch('/usuarios/' + id, { method: 'DELETE' });
        mostrarAlerta('Usuario eliminado');
        cargar();
    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}
