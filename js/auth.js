// ============================================================
// MECSYS — Autenticación con Supabase
// ============================================================
import { supabase } from './supabase.js';
import { showToast } from './ui.js';

export let currentUser = null;

// Devuelve el usuario activo o null
export async function initAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user ?? null;
    return currentUser;
}

// Muestra u oculta el overlay de login
export function showAuthOverlay(visible) {
    const overlay = document.getElementById('authOverlay');
    if (visible) {
        overlay.classList.add('visible');
        document.getElementById('sidebar').style.display    = 'none';
        document.querySelector('.topbar').style.display     = 'none';
        document.getElementById('mainContent').style.display = 'none';
    } else {
        overlay.classList.remove('visible');
        document.getElementById('sidebar').style.display    = '';
        document.querySelector('.topbar').style.display     = '';
        document.getElementById('mainContent').style.display = '';
    }
}

// Inicializa los formularios de login/registro
export function initAuthForms(onLogin) {
    // Tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('formLogin').style.display    = tab.dataset.tab === 'login'    ? '' : 'none';
            document.getElementById('formRegister').style.display = tab.dataset.tab === 'register' ? '' : 'none';
        });
    });

    // Login
    document.getElementById('formLogin').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        btn.textContent = 'Entrando…'; btn.disabled = true;

        const { data, error } = await supabase.auth.signInWithPassword({
            email:    document.getElementById('loginEmail').value.trim(),
            password: document.getElementById('loginPassword').value,
        });

        btn.textContent = 'Entrar'; btn.disabled = false;

        if (error) {
            document.getElementById('loginError').textContent = tradError(error.message);
            return;
        }
        currentUser = data.user;
        showAuthOverlay(false);
        onLogin(data.user);
    });

    // Registro
    document.getElementById('formRegister').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('[type=submit]');
        btn.textContent = 'Creando cuenta…'; btn.disabled = true;

        const { data, error } = await supabase.auth.signUp({
            email:    document.getElementById('regEmail').value.trim(),
            password: document.getElementById('regPassword').value,
            options:  { data: { nombre: document.getElementById('regNombre').value.trim() } }
        });

        btn.textContent = 'Crear cuenta'; btn.disabled = false;

        if (error) {
            document.getElementById('regError').textContent = tradError(error.message);
            return;
        }

        if (data.session) {
            // Login automático (email confirm desactivado)
            currentUser = data.user;
            showAuthOverlay(false);
            onLogin(data.user);
        } else {
            showToast('Revisá tu email para confirmar la cuenta', 'info');
            document.getElementById('regError').style.color = 'var(--success)';
            document.getElementById('regError').textContent = 'Cuenta creada. Revisá tu email.';
        }
    });
}

export async function signOut() {
    await supabase.auth.signOut();
    currentUser = null;
    location.reload();
}

function tradError(msg) {
    if (msg.includes('Invalid login')) return 'Email o contraseña incorrectos.';
    if (msg.includes('already registered')) return 'Ese email ya está registrado.';
    if (msg.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
    return msg;
}
