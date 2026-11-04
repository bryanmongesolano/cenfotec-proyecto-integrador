async function apiFetch(ruta, opciones = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(opciones.headers || {})
    };

    const token = obtenerToken();

    if (token) {
        headers.Authorization = 'Bearer ' + token;
    }

    const respuesta = await fetch(API.BASE + ruta, { ...opciones, headers });

    let datos = null;
    try {
        datos = await respuesta.json();
    } catch (error) { }

    if (respuesta.status === 401) {
        cerrarSesion();
        throw new Error('La sesión expiró');
    }

    if (!respuesta.ok) {
        throw new Error(datos && datos.message ? datos.message : 'Error ' + respuesta.status);
    }

    return datos;
}

async function apiPublica(ruta) {
    const respuesta = await fetch(API.BASE + ruta);
    const datos = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
        throw new Error(datos && datos.message ? datos.message : 'Error ' + respuesta.status);
    }

    return datos;
}

function esc(texto) {    if (texto === null || texto === undefined) return '';

    return String(texto).replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[caracter]));
}

function moneda(valor) {
    return new Intl.NumberFormat('es-CR', {
        style: 'currency',
        currency: 'CRC',
        maximumFractionDigits: 0
    }).format(Number(valor) || 0);
}

function fecha(valor) {
    if (!valor) return '—';

    const d = new Date(valor);

    return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CR');
}

function mostrarAlerta(mensaje, tipo = 'success') {
    const contenedor = document.getElementById('alerta');

    if (!contenedor) {
        alert(mensaje);
        return;
    }

    contenedor.innerHTML = `<div class="alert alert-${tipo} py-2">${esc(mensaje)}</div>`;

    setTimeout(() => {
        contenedor.innerHTML = '';
    }, 4000);
}

function badgePedido(estado) {
    const colores = {
        pendiente: 'warning',
        pagado: 'info',
        enviado: 'primary',
        entregado: 'success',
        cancelado: 'danger'
    };

    return `<span class="badge bg-${colores[estado] || 'secondary'}">${esc(estado)}</span>`;
}

function badgeActivo(estado) {
    return estado
        ? '<span class="badge bg-success">Activo</span>'
        : '<span class="badge bg-secondary">Inactivo</span>';
}

function estrellas(cantidad) {
    const total = Number(cantidad) || 0;

    return '<span class="stars">' + '★'.repeat(total) + '☆'.repeat(5 - total) + '</span>';
}
