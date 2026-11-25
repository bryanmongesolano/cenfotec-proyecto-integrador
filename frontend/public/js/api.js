async function apiFetch(ruta, opciones = {}) {
    const { silencioso = false, ...fetchOpciones } = opciones;
    const headers = {
        'Content-Type': 'application/json',
        ...(fetchOpciones.headers || {})
    };

    const token = obtenerToken();
    if (token) headers.Authorization = 'Bearer ' + token;

    if (!silencioso) mostrarSpinner();

    try {
        const respuesta = await fetch(API.BASE + ruta, { ...fetchOpciones, headers });
        const datos = await respuesta.json().catch(() => null);

        if (respuesta.status === 401 && token) {
            if (silencioso) {
                limpiarSesionLocal();
            } else {
                cerrarSesion({ expirada: true });
            }
            throw new Error('La sesión expiró');
        }

        if (!respuesta.ok) {
            throw new Error(datos && datos.message ? datos.message : 'Error ' + respuesta.status);
        }

        return datos;
    } finally {
        if (!silencioso) ocultarSpinner();
    }
}

async function apiPublica(ruta, opciones = {}) {
    const { silencioso = false } = opciones;
    if (!silencioso) mostrarSpinner();

    try {
        const respuesta = await fetch(API.BASE + ruta);
        const datos = await respuesta.json().catch(() => null);

        if (!respuesta.ok) {
            throw new Error(datos && datos.message ? datos.message : 'Error ' + respuesta.status);
        }

        return datos;
    } finally {
        if (!silencioso) ocultarSpinner();
    }
}

function esc(texto) {
    if (texto === null || texto === undefined) return '';
    return String(texto).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
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
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function fechaCorta(valor) {
    if (!valor) return '—';
    const d = new Date(valor);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function mostrarAlerta(mensaje, tipo = 'success') {
    mostrarToast(mensaje, tipo);
}

function crearBadgeEstado(color, icono, texto) {
    return `<span class="badge rounded-pill bg-${color}-subtle text-${color}-emphasis border border-${color}-subtle px-2 py-1"><i class="bi bi-${icono} me-1" aria-hidden="true"></i>${esc(texto)}</span>`;
}

function badgePedido(estado) {
    const mapa = {
        pendiente: ['warning', 'clock', 'Pendiente'],
        pagado: ['info', 'check2-circle', 'Pagado'],
        enviado: ['primary', 'truck', 'Enviado'],
        entregado: ['success', 'box-seam', 'Entregado'],
        cancelado: ['danger', 'x-circle', 'Cancelado']
    };
    const [color, icono, texto] = mapa[estado] || ['secondary', 'circle', estado || 'Desconocido'];
    return crearBadgeEstado(color, icono, texto);
}

function badgePago(estado) {
    const mapa = {
        pendiente: ['warning', 'hourglass-split', 'Pendiente'],
        aprobado: ['success', 'check-circle', 'Aprobado'],
        rechazado: ['danger', 'x-octagon', 'Rechazado']
    };
    const [color, icono, texto] = mapa[estado] || ['secondary', 'circle', estado || 'Desconocido'];
    return crearBadgeEstado(color, icono, texto);
}

function badgeActivo(estado) {
    return estado
        ? crearBadgeEstado('success', 'check-circle-fill', 'Activo')
        : crearBadgeEstado('secondary', 'dash-circle-fill', 'Inactivo');
}

function estrellas(cantidad) {
    const total = Math.max(0, Math.min(5, Math.round(Number(cantidad) || 0)));
    return `<span class="stars" aria-label="${total} de 5 estrellas">${'★'.repeat(total)}${'☆'.repeat(5 - total)}</span>`;
}
