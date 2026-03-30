// ============================================================
// MECSYS — Utilidades de UI (toast, modal, helpers)
// ============================================================

// ----- Toast -----
let toastTimer = null;

export function showToast(msg, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
}

// ----- Modal -----
export function openModal(title, bodyHTML, width = '640px') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modal').style.maxWidth = width;
    document.getElementById('modalOverlay').classList.add('open');
}

export function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.getElementById('modalBody').innerHTML = '';
}

// ----- Spinner -----
export function spinner() {
    return `<div class="spinner"></div>`;
}

// ----- Estado vacío -----
export function emptyState(msg = 'No hay datos disponibles') {
    return `<div class="empty-state">
        <div class="empty-icon">◻</div>
        <div class="empty-text">${msg}</div>
    </div>`;
}

// ----- Badge de estado -----
export function badge(estado) {
    return `<span class="badge badge-${estado}">${estado.replace('_', ' ')}</span>`;
}

// ----- Formatear fecha -----
export function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

export function fmtDateShort(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

// ----- Formatear moneda -----
export function fmtMoney(n) {
    if (n == null) return '$0,00';
    return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

// ----- Setear título de página -----
export function setPageTitle(title) {
    document.getElementById('pageTitle').textContent = title;
}

// ----- Setear acciones del topbar -----
export function setTopbarActions(html) {
    document.getElementById('topbarActions').innerHTML = html;
}

// ----- Render en main -----
export function renderMain(html) {
    const el = document.getElementById('mainContent');
    el.innerHTML = html;
    // Trigger page-enter animation
    el.classList.remove('page-enter');
    void el.offsetWidth; // reflow
    el.classList.add('page-enter');
}

// ----- Máscara de DNI: 99.999.999 -----
export function applyDniMask(input) {
    input.setAttribute('maxlength', '10');
    input.setAttribute('placeholder', '12.345.678');

    const format = (val) => {
        const d = val.replace(/\D/g, '').slice(0, 8);
        if (d.length <= 2) return d;
        if (d.length <= 5) return d.slice(0,2) + '.' + d.slice(2);
        return d.slice(0,2) + '.' + d.slice(2,5) + '.' + d.slice(5);
    };

    input.addEventListener('input', e => {
        const pos = e.target.selectionStart;
        e.target.value = format(e.target.value);
    });

    input.addEventListener('paste', e => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        input.value = format(text);
    });

    // Formatear valor inicial si ya tiene uno
    if (input.value) input.value = format(input.value);
}

// ----- Máscara de teléfono: 9999-999999 -----
export function applyPhoneMask(input) {
    input.setAttribute('maxlength', '11');
    input.setAttribute('placeholder', '1234-567890');
    input.addEventListener('input', e => {
        let digits = e.target.value.replace(/\D/g, '').slice(0, 10);
        e.target.value = digits.length > 4
            ? digits.slice(0, 4) + '-' + digits.slice(4)
            : digits;
    });
    // Evitar pegar texto no numérico
    input.addEventListener('paste', e => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        let digits = text.replace(/\D/g, '').slice(0, 10);
        input.value = digits.length > 4
            ? digits.slice(0, 4) + '-' + digits.slice(4)
            : digits;
    });
}
