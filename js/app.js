// ============================================================
// MECSYS — Entry point (app.js)
// ============================================================
import { closeModal } from './ui.js';
import { initAuth, initAuthForms, showAuthOverlay, signOut, currentUser } from './auth.js';
import { renderDashboard }    from './pages/dashboard.js';
import { renderTurnos }       from './pages/turnos.js';
import { renderPresupuestos } from './pages/presupuestos.js';
import { renderClientes }     from './pages/clientes.js';
import { renderRepuestos }    from './pages/repuestos.js';

const PAGES = {
    dashboard:    { render: renderDashboard,    title: 'Dashboard' },
    turnos:       { render: renderTurnos,       title: 'Turnos' },
    presupuestos: { render: renderPresupuestos, title: 'Presupuestos' },
    clientes:     { render: renderClientes,     title: 'Clientes' },
    repuestos:    { render: renderRepuestos,    title: 'Repuestos' },
};

function navigate(page) {
    const def = PAGES[page] || PAGES.dashboard;
    document.querySelectorAll('.nav-item').forEach(el =>
        el.classList.toggle('active', el.dataset.page === page));
    document.getElementById('sidebar').classList.remove('open');
    def.render();
    window.location.hash = page;
}

function initApp(user) {
    // Mostrar info del usuario en topbar
    const email = user?.email || '';
    const topbarRight = document.getElementById('topbarUser');
    if (topbarRight) {
        topbarRight.innerHTML = `
            <span style="font-size:.8rem;color:var(--text-muted);margin-right:8px">${email}</span>
            <button class="btn btn-ghost btn-sm" id="btnSignOut">Salir</button>
        `;
        document.getElementById('btnSignOut').addEventListener('click', signOut);
    }

    // Navegación
    document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
    });

    document.getElementById('menuToggle').addEventListener('click', () =>
        document.getElementById('sidebar').classList.toggle('open'));

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });

    const initPage = window.location.hash.replace('#', '') || 'dashboard';
    navigate(initPage);
}

// ----- Bootstrap -----
const user = await initAuth();

initAuthForms(u => initApp(u));

if (user) {
    showAuthOverlay(false);
    initApp(user);
} else {
    showAuthOverlay(true);
}
