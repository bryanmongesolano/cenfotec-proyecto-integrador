const HTML_SPINNER = `
    <div class="bg-white border shadow rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2 small">
        <div class="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>
        <span class="text-muted fw-medium">Cargando...</span>
    </div>`;

let peticionesActivas = 0;

function mostrarSpinner() {
    peticionesActivas++;
    const contenedor = document.getElementById('mensajeSpinner');
    if (contenedor && peticionesActivas === 1) {
        contenedor.innerHTML = HTML_SPINNER;
    }
}

function ocultarSpinner() {
    peticionesActivas = Math.max(0, peticionesActivas - 1);
    const contenedor = document.getElementById('mensajeSpinner');
    if (contenedor && peticionesActivas === 0) {
        contenedor.innerHTML = '';
    }
}

function obtenerContenedorModales() {
    let contenedor = document.getElementById('modalMensajes');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'modalMensajes';
        document.body.appendChild(contenedor);
    }
    return contenedor;
}

function mostrarToast(mensaje, tipo = 'success') {
    let contenedor = document.getElementById('toastContainerApp');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'toastContainerApp';
        contenedor.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        contenedor.style.zIndex = '1100';
        document.body.appendChild(contenedor);
    }

    const estilos = {
        success: ['text-bg-success', 'check-circle-fill', 'btn-close-white'],
        danger: ['text-bg-danger', 'exclamation-octagon-fill', 'btn-close-white'],
        warning: ['text-bg-warning', 'exclamation-triangle-fill', ''],
        info: ['text-bg-info', 'info-circle-fill', '']
    };
    const [clase, icono, btnClose] = estilos[tipo] || ['text-bg-secondary', 'info-circle', 'btn-close-white'];

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${clase} border-0 shadow-lg`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center gap-2 fw-medium">
                <i class="bi bi-${icono}" aria-hidden="true"></i>
                <span>${esc(mensaje)}</span>
            </div>
            <button type="button" class="btn-close ${btnClose} me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
        </div>`;

    contenedor.appendChild(toastEl);
    const delay = tipo === 'danger' || tipo === 'warning' ? 5000 : 3500;
    const toast = new bootstrap.Toast(toastEl, { delay });
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    toast.show();
}

function confirmarAccion({ titulo = 'Confirmar acción', mensaje = '¿Desea continuar?', textoConfirmar = 'Confirmar', variante = 'danger' } = {}) {
    return new Promise((resolve) => {
        obtenerContenedorModales().innerHTML = `
            <div class="modal fade" id="modalConfirmarAccion" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow">
                        <div class="modal-header">
                            <h5 class="modal-title fw-bold">${esc(titulo)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-0 text-secondary">${esc(mensaje)}</p>
                        </div>
                        <div class="modal-footer border-top-0">
                            <button type="button" class="btn btn-light border" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-${variante}" id="btnConfirmarAccionOk">${esc(textoConfirmar)}</button>
                        </div>
                    </div>
                </div>
            </div>`;

        const modalEl = document.getElementById('modalConfirmarAccion');
        const modal = new bootstrap.Modal(modalEl);
        let confirmado = false;

        document.getElementById('btnConfirmarAccionOk').addEventListener('click', () => {
            confirmado = true;
            modal.hide();
        });

        modalEl.addEventListener('hidden.bs.modal', () => {
            modal.dispose();
            resolve(confirmado);
        }, { once: true });

        modal.show();
    });
}

function pedirDato({ titulo = 'Ingresar dato', etiqueta = 'Valor', valorInicial = '', placeholder = '', tipo = 'text', min = '', obligatorio = false, textoConfirmar = 'Guardar' } = {}) {
    return new Promise((resolve) => {
        obtenerContenedorModales().innerHTML = `
            <div class="modal fade" id="modalPedirDato" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <form class="modal-content border-0 shadow" id="formPedirDato">
                        <div class="modal-header">
                            <h5 class="modal-title fw-bold">${esc(titulo)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                        </div>
                        <div class="modal-body">
                            <label class="form-label fw-medium" for="inputPedirDato">${esc(etiqueta)}</label>
                            <input
                                type="${esc(tipo)}"
                                class="form-control"
                                id="inputPedirDato"
                                value="${esc(valorInicial)}"
                                placeholder="${esc(placeholder)}"
                                ${min !== '' ? `min="${esc(min)}"` : ''}
                                ${obligatorio ? 'required' : ''}
                            >
                        </div>
                        <div class="modal-footer border-top-0">
                            <button type="button" class="btn btn-light border" data-bs-dismiss="modal">Cancelar</button>
                            <button type="submit" class="btn btn-primary">${esc(textoConfirmar)}</button>
                        </div>
                    </form>
                </div>
            </div>`;

        const modalEl = document.getElementById('modalPedirDato');
        const inputEl = document.getElementById('inputPedirDato');
        const modal = new bootstrap.Modal(modalEl);
        let resultado = null;

        document.getElementById('formPedirDato').addEventListener('submit', (ev) => {
            ev.preventDefault();
            resultado = inputEl.value;
            modal.hide();
        });

        modalEl.addEventListener('shown.bs.modal', () => {
            inputEl.focus();
            inputEl.select();
        }, { once: true });

        modalEl.addEventListener('hidden.bs.modal', () => {
            modal.dispose();
            resolve(resultado);
        }, { once: true });

        modal.show();
    });
}

function inicialesUsuario(nombre, apellido) {
    const n = String(nombre || '').trim();
    const a = String(apellido || '').trim();
    return ((n[0] || '') + (a[0] || n[1] || '')).toUpperCase() || 'U';
}

function paginarLista(lista, paginaActual, porPagina) {
    const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
    const pagina = Math.min(Math.max(1, paginaActual), totalPaginas);
    const inicio = (pagina - 1) * porPagina;
    return {
        pagina,
        items: lista.slice(inicio, inicio + porPagina)
    };
}

function renderizarPaginacion(contenedorId, totalItems, paginaActual, porPagina, onCambiarPagina) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    const totalPaginas = Math.max(1, Math.ceil(totalItems / porPagina));
    const pagina = Math.min(Math.max(1, paginaActual), totalPaginas);
    const desde = totalItems === 0 ? 0 : (pagina - 1) * porPagina + 1;
    const hasta = Math.min(totalItems, pagina * porPagina);

    let botones = `
        <li class="page-item ${pagina <= 1 ? 'disabled' : ''}">
            <button type="button" class="page-link" data-page="${pagina - 1}" aria-label="Anterior">&laquo;</button>
        </li>`;

    for (let i = Math.max(1, pagina - 2); i <= Math.min(totalPaginas, pagina + 2); i++) {
        botones += `
            <li class="page-item ${i === pagina ? 'active' : ''}">
                <button type="button" class="page-link" data-page="${i}">${i}</button>
            </li>`;
    }

    botones += `
        <li class="page-item ${pagina >= totalPaginas ? 'disabled' : ''}">
            <button type="button" class="page-link" data-page="${pagina + 1}" aria-label="Siguiente">&raquo;</button>
        </li>`;

    contenedor.innerHTML = `
        <div class="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 pt-3 border-top">
            <small class="text-muted">Mostrando <strong>${desde}–${hasta}</strong> de <strong>${totalItems}</strong> registro(s)</small>
            ${totalPaginas > 1 ? `<nav aria-label="Paginación"><ul class="pagination pagination-sm mb-0">${botones}</ul></nav>` : ''}
        </div>`;

    contenedor.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const nueva = Number(btn.dataset.page);
            if (nueva >= 1 && nueva <= totalPaginas && nueva !== pagina) {
                onCambiarPagina(nueva);
            }
        });
    });
}

function renderizarStepperPedido(estado) {
    if (estado === 'cancelado') return '';

    const pasos = [
        { clave: 'pendiente', label: 'Recibido', icono: 'receipt' },
        { clave: 'pagado', label: 'Pagado', icono: 'credit-card-2-front' },
        { clave: 'enviado', label: 'Enviado', icono: 'truck' },
        { clave: 'entregado', label: 'Entregado', icono: 'house-check' }
    ];

    const indice = Math.max(0, pasos.findIndex(p => p.clave === estado));
    const progreso = Math.round((indice / (pasos.length - 1)) * 100);

    return `
        <div class="mb-3">
            <div class="progress mb-2" style="height: 6px;">
                <div class="progress-bar bg-primary" style="width: ${progreso}%"></div>
            </div>
            <div class="row g-1 text-center">
                ${pasos.map((p, idx) => {
                    const completado = idx < indice;
                    const actual = idx === indice;
                    const badgeCls = completado ? 'text-bg-success' : actual ? 'text-bg-primary' : 'text-bg-light border text-secondary';
                    return `
                        <div class="col-3">
                            <span class="badge rounded-circle ${badgeCls} d-inline-flex align-items-center justify-content-center mb-1" style="width: 30px; height: 30px;">
                                <i class="bi bi-${completado ? 'check-lg' : p.icono}" aria-hidden="true"></i>
                            </span>
                            <div class="small ${completado || actual ? 'fw-semibold text-dark' : 'text-muted'}" style="font-size: 0.75rem;">${p.label}</div>
                        </div>`;
                }).join('')}
            </div>
        </div>`;
}

async function copiarTexto(texto, mensajeExito = 'Copiado al portapapeles') {
    try {
        await navigator.clipboard.writeText(texto);
        mostrarAlerta(mensajeExito, 'info');
    } catch (error) {
        mostrarAlerta('No se pudo copiar al portapapeles', 'warning');
    }
}

function alternarVisibilidadPassword(inputId, boton) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const mostrar = input.type === 'password';
    input.type = mostrar ? 'text' : 'password';
    const icono = boton.querySelector('i');
    if (icono) icono.className = mostrar ? 'bi bi-eye-slash' : 'bi bi-eye';
}
