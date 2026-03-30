// ============================================================
// MECSYS — Entry point (app.js)
// ============================================================
import { closeModal, openModal } from './ui.js';
import { initAuth, initAuthForms, showAuthOverlay, signOut, currentUser } from './auth.js';
import { renderDashboard }    from './pages/dashboard.js';
import { renderTurnos }       from './pages/turnos.js';
import { renderPresupuestos } from './pages/presupuestos.js';
import { renderClientes }     from './pages/clientes.js';
import { renderRepuestos }    from './pages/repuestos.js';

// ============================================================
// Config del taller (localStorage)
// ============================================================
function loadTallerConfig() {
    const nombre = localStorage.getItem('taller_nombre') || 'Mi Taller';
    const logo   = localStorage.getItem('taller_logo')  || '';

    document.getElementById('tallerNombre').textContent = nombre;

    const initEl = document.getElementById('tallerInitials');
    const imgEl  = document.getElementById('tallerLogoImg');

    if (logo) {
        imgEl.src            = logo;
        imgEl.style.display  = '';
        initEl.style.display = 'none';
    } else {
        imgEl.src            = 'img/default-taller.svg';
        imgEl.style.display  = '';
        initEl.style.display = 'none';
    }
}

function openAcercaDe() {
    openModal('Acerca de MecSys', `
        <div style="display:flex;flex-direction:column;align-items:center;gap:20px;padding:8px 0 4px">

            <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
                <span style="font-size:3.5rem;line-height:1;filter:drop-shadow(0 2px 8px var(--accent-glow))">⚙</span>
                <span style="font-size:1.6rem;font-weight:800;letter-spacing:2px;color:var(--accent)">MecSys</span>
            </div>

            <p style="text-align:center;font-size:.9rem;color:var(--text-muted);max-width:300px;line-height:1.5">
                Sistema de gestión para talleres mecánicos
            </p>

            <div style="width:100%;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);
                        padding:16px 0;display:flex;flex-direction:column;align-items:center;gap:6px">
                <span style="font-size:.72rem;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted)">Autor</span>
                <span style="font-size:1rem;font-weight:600;color:var(--text)">Martín Rindlisbacher</span>
            </div>

            <p style="font-size:.78rem;color:var(--text-muted);text-align:center">
                © 2026 · Todos los derechos reservados
            </p>

            <button class="btn btn-ghost btn-sm" id="closeAcerca">Cerrar</button>
        </div>
    `, '360px');

    document.getElementById('closeAcerca').addEventListener('click', closeModal);
}

function openTallerConfig() {
    const nombre    = localStorage.getItem('taller_nombre')    || '';
    const logo      = localStorage.getItem('taller_logo')      || '';
    const direccion = localStorage.getItem('taller_direccion') || '';

    openModal('Configurar taller', `
        <div style="display:flex;flex-direction:column;gap:18px">

            <div style="display:flex;align-items:center;gap:16px">
                <div id="previewWrap" style="
                    width:64px;height:64px;border-radius:10px;
                    background:var(--bg-card-2);border:1px solid var(--border-light);
                    display:flex;align-items:center;justify-content:center;
                    overflow:hidden;flex-shrink:0">
                    ${logo
                        ? `<img src="${logo}" style="width:100%;height:100%;object-fit:cover">`
                        : `<span id="previewInit" style="font-size:1.8rem;font-weight:800;color:var(--accent)">${nombre.charAt(0) || 'T'}</span>`
                    }
                </div>
                <div style="flex:1">
                    <label style="font-size:.8rem;font-weight:500;color:var(--text-muted);
                                  text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:6px">
                        Logo del taller
                    </label>
                    <label class="btn btn-ghost btn-sm" style="cursor:pointer;display:inline-flex">
                        📁 Subir imagen
                        <input type="file" id="inputLogo" accept="image/*" style="display:none">
                    </label>
                    ${logo ? `<button class="btn btn-ghost btn-sm" id="btnBorrarLogo" style="margin-left:8px">✕ Quitar</button>` : ''}
                </div>
            </div>

            <div>
                <label style="font-size:.8rem;font-weight:500;color:var(--text-muted);
                              text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:6px">
                    Nombre del taller
                </label>
                <input type="text" id="inputTallerNombre" value="${nombre}"
                       placeholder="Ej: Taller García" maxlength="40"
                       style="width:100%">
            </div>

            <div>
                <label style="font-size:.8rem;font-weight:500;color:var(--text-muted);
                              text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:6px">
                    Dirección
                </label>
                <input type="text" id="inputTallerDireccion" value="${direccion}"
                       placeholder="Ej: Av. San Martín 1234, Buenos Aires" maxlength="80"
                       style="width:100%">
            </div>

            <div class="form-actions" style="margin-top:0">
                <button class="btn btn-ghost" id="cancelTaller">Cancelar</button>
                <button class="btn btn-primary" id="saveTaller">Guardar</button>
            </div>
        </div>
    `, '440px');

    // Preview al elegir imagen
    document.getElementById('inputLogo').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            document.getElementById('previewWrap').innerHTML =
                `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover">`;
        };
        reader.readAsDataURL(file);
    });

    // Quitar logo
    document.getElementById('btnBorrarLogo')?.addEventListener('click', () => {
        localStorage.removeItem('taller_logo');
        document.getElementById('previewWrap').innerHTML =
            `<span id="previewInit" style="font-size:1.8rem;font-weight:800;color:var(--accent)">
                ${document.getElementById('inputTallerNombre').value.charAt(0) || 'T'}
             </span>`;
    });

    // Preview inicial al escribir nombre (solo si no hay logo)
    document.getElementById('inputTallerNombre').addEventListener('input', e => {
        const pi = document.getElementById('previewInit');
        if (pi) pi.textContent = e.target.value.charAt(0).toUpperCase() || 'T';
    });

    document.getElementById('cancelTaller').addEventListener('click', closeModal);

    document.getElementById('saveTaller').addEventListener('click', () => {
        const nuevoNombre    = document.getElementById('inputTallerNombre').value.trim() || 'Mi Taller';
        const nuevaDireccion = document.getElementById('inputTallerDireccion').value.trim();
        localStorage.setItem('taller_nombre', nuevoNombre);
        localStorage.setItem('taller_direccion', nuevaDireccion);

        // Guardar logo si se eligió uno
        const file = document.getElementById('inputLogo').files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => {
                localStorage.setItem('taller_logo', ev.target.result);
                loadTallerConfig();
                closeModal();
            };
            reader.readAsDataURL(file);
        } else {
            loadTallerConfig();
            closeModal();
        }
    });
}

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

    // Config del taller
    loadTallerConfig();
    document.getElementById('tallerHeader').addEventListener('click', openTallerConfig);
    document.getElementById('mecsysBrand').addEventListener('click', openAcercaDe);

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });

    const initPage = window.location.hash.replace('#', '') || 'dashboard';
    navigate(initPage);
}

// ----- Deshabilitar autocompletado globalmente -----
const _disableAutocomplete = (root) => {
    root.querySelectorAll('input, textarea').forEach(el => {
        el.setAttribute('autocomplete', 'off');
    });
};
_disableAutocomplete(document);
new MutationObserver(mutations => {
    mutations.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches('input, textarea')) node.setAttribute('autocomplete', 'off');
        else _disableAutocomplete(node);
    }));
}).observe(document.body, { childList: true, subtree: true });

// ----- Bootstrap -----
const user = await initAuth();

initAuthForms(u => initApp(u));

if (user) {
    showAuthOverlay(false);
    initApp(user);
} else {
    showAuthOverlay(true);
}
