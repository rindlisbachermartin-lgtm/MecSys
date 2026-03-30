// ============================================================
// MECSYS — Página: Dashboard
// ============================================================
import { supabase }     from '../supabase.js';
import { currentUser }  from '../auth.js';
import { renderMain, setPageTitle, setTopbarActions,
         badge, fmtDate, spinner, fmtMoney, showToast } from '../ui.js';

const DIAS       = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_FULL  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES      = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio',
                    'julio','agosto','septiembre','octubre','noviembre','diciembre'];

// ----- Clima -----
const WMO = {
    0:  { label: 'Despejado',         icon: '☀️' },
    1:  { label: 'Mayormente despejado', icon: '🌤️' },
    2:  { label: 'Parcialmente nublado', icon: '⛅' },
    3:  { label: 'Nublado',           icon: '☁️' },
    45: { label: 'Niebla',            icon: '🌫️' },
    48: { label: 'Niebla con escarcha', icon: '🌫️' },
    51: { label: 'Llovizna ligera',   icon: '🌦️' },
    53: { label: 'Llovizna moderada', icon: '🌦️' },
    55: { label: 'Llovizna densa',    icon: '🌧️' },
    61: { label: 'Lluvia ligera',     icon: '🌧️' },
    63: { label: 'Lluvia moderada',   icon: '🌧️' },
    65: { label: 'Lluvia intensa',    icon: '🌧️' },
    71: { label: 'Nevada ligera',     icon: '🌨️' },
    73: { label: 'Nevada moderada',   icon: '❄️' },
    75: { label: 'Nevada intensa',    icon: '❄️' },
    80: { label: 'Chaparrones',       icon: '🌦️' },
    81: { label: 'Chaparrones moderados', icon: '🌧️' },
    82: { label: 'Chaparrones fuertes',  icon: '⛈️' },
    95: { label: 'Tormenta',          icon: '⛈️' },
    96: { label: 'Tormenta con granizo', icon: '⛈️' },
    99: { label: 'Tormenta severa',   icon: '⛈️' },
};

function getWmo(code) {
    return WMO[code] ?? { label: 'Variable', icon: '🌡️' };
}

function greeting() {
    const h = new Date().getHours();
    if (h >= 6  && h < 13) return 'Buenos días';
    if (h >= 13 && h < 20) return 'Buenas tardes';
    return 'Buenas noches';
}

async function fetchWeather() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(async ({ coords }) => {
            try {
                const res = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}` +
                    `&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m&timezone=auto&forecast_days=1`
                );
                const json = await res.json();
                const c = json.current;
                // Ciudad via Nominatim
                let city = '';
                try {
                    const geo = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
                        { headers: { 'Accept-Language': 'es' } }
                    );
                    const gj = await geo.json();
                    city = gj.address?.city || gj.address?.town || gj.address?.village || '';
                } catch { /* ciudad opcional */ }
                resolve({
                    temp:     Math.round(c.temperature_2m),
                    code:     c.weathercode,
                    wind:     Math.round(c.windspeed_10m),
                    humidity: c.relative_humidity_2m,
                    city,
                });
            } catch { resolve(null); }
        }, () => resolve(null), { timeout: 6000 });
    });
}

function weekRange(offset = 0) {
    const now  = new Date();
    const day  = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon  = new Date(now); mon.setDate(now.getDate() + diff + offset * 7); mon.setHours(0,0,0,0);
    const sun  = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
    return { mon, sun };
}

// Datos en memoria para no re-fetchar al cambiar día
let _turnos    = [];
let _allTurnos = [];
let _days      = [];

export async function renderDashboard() {
    setPageTitle('Dashboard');
    setTopbarActions('');
    renderMain(spinner());

    const { mon, sun } = weekRange();

    // Lanzar clima y datos en paralelo
    const [
        [{ data: turnos, error }, { data: allTurnos }],
        weather
    ] = await Promise.all([
        Promise.all([
            supabase.from('turnos').select(`
                id, fecha_hora, estado, tareas,
                clientes(nombre, apellido, telefono),
                vehiculos(patente, marca, modelo)
            `).gte('fecha_hora', mon.toISOString()).lte('fecha_hora', sun.toISOString()).order('fecha_hora'),
            supabase.from('turnos').select(`
                id, fecha_hora, estado, tareas,
                clientes(nombre, apellido, telefono),
                vehiculos(patente, marca, modelo)
            `).order('fecha_hora', { ascending: false })
        ]),
        fetchWeather()
    ]);

    if (error) {
        showToast('Error cargando turnos: ' + error.message, 'error');
        renderMain(`<p style="color:var(--danger)">${error.message}</p>`);
        return;
    }

    _turnos    = turnos    || [];
    _allTurnos = allTurnos || [];

    // Construir array de 7 días
    _days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        return d;
    });

    // Estadísticas globales
    const conteo = { pendiente: 0, en_proceso: 0, finalizado: 0, cancelado: 0 };
    _allTurnos.forEach(t => { if (conteo[t.estado] !== undefined) conteo[t.estado]++; });

    // Día seleccionado por defecto: hoy (o lunes si hoy no está en la semana)
    const today = new Date(); today.setHours(0,0,0,0);
    let selectedIdx = _days.findIndex(d => d.toDateString() === today.toDateString());
    if (selectedIdx === -1) selectedIdx = 0;

    // Saludo
    const nombre = currentUser?.user_metadata?.nombre || currentUser?.email?.split('@')[0] || '';
    const now    = new Date();
    const fechaLabel = `${DIAS_FULL[now.getDay()]} ${now.getDate()} de ${MESES_FULL[now.getMonth()]} de ${now.getFullYear()}`;

    // Widget de clima
    let weatherHTML = '';
    if (weather) {
        const wmo = getWmo(weather.code);
        weatherHTML = `
            <div class="weather-widget">
                <div class="weather-icon">${wmo.icon}</div>
                <div class="weather-info">
                    <div class="weather-temp">${weather.temp}°C</div>
                    <div class="weather-desc">${wmo.label}${weather.city ? ` · ${weather.city}` : ''}</div>
                    <div class="weather-extra">
                        <span>💨 ${weather.wind} km/h</span>
                        <span>💧 ${weather.humidity}%</span>
                    </div>
                </div>
            </div>`;
    }

    renderMain(`
        <!-- Saludo -->
        <div class="dash-greeting">
            <div class="dash-greeting-left">
                <h2 class="greeting-title">${greeting()}, ${nombre} 👋</h2>
                <p class="greeting-date">${fechaLabel}</p>
            </div>
            ${weatherHTML}
        </div>

        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card stat-card-btn" data-filter="pendiente">
                <span class="stat-label">Pendientes</span>
                <span class="stat-value warning">${conteo.pendiente}</span>
            </div>
            <div class="stat-card stat-card-btn" data-filter="en_proceso">
                <span class="stat-label">En Proceso</span>
                <span class="stat-value accent">${conteo.en_proceso}</span>
            </div>
            <div class="stat-card stat-card-btn" data-filter="finalizado">
                <span class="stat-label">Finalizados</span>
                <span class="stat-value success">${conteo.finalizado}</span>
            </div>
            <div class="stat-card stat-card-btn" data-filter="semana">
                <span class="stat-label">Esta Semana</span>
                <span class="stat-value">${_turnos.length}</span>
            </div>
        </div>

        <!-- Panel de listado al clickear stat -->
        <div id="statPanel"></div>

        <!-- Semana -->
        <div id="weekSection"></div>

        <!-- Turnos del día seleccionado -->
        <div id="dayTurnos"></div>
    `);

    animateCounters();

    // Clicks en stat cards
    let activeFilter = null;
    document.querySelectorAll('.stat-card-btn').forEach(card => {
        card.addEventListener('click', () => {
            const filter = card.dataset.filter;
            if (activeFilter === filter) {
                // Toggle: cerrar si ya está abierto
                activeFilter = null;
                document.querySelectorAll('.stat-card-btn').forEach(c => c.classList.remove('active'));
                document.getElementById('statPanel').innerHTML = '';
                return;
            }
            activeFilter = filter;
            document.querySelectorAll('.stat-card-btn').forEach(c =>
                c.classList.toggle('active', c.dataset.filter === filter));
            renderStatPanel(filter);
        });
    });

    renderWeek(0);
}

async function renderWeek(offset) {
    const section = document.getElementById('weekSection');
    if (!section) return;

    const { mon, sun } = weekRange(offset);
    const isCurrentWeek = offset === 0;
    const today = new Date(); today.setHours(0,0,0,0);

    // Spinner mientras carga
    section.innerHTML = `<div class="spinner" style="padding:30px"></div>`;

    const { data: semTurnos } = await supabase.from('turnos').select(`
        id, fecha_hora, estado, tareas,
        clientes(nombre, apellido),
        vehiculos(patente, marca, modelo)
    `).gte('fecha_hora', mon.toISOString()).lte('fecha_hora', sun.toISOString()).order('fecha_hora');

    _turnos = semTurnos || [];
    _days   = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(mon); d.setDate(mon.getDate() + i); return d;
    });

    // Día seleccionado: hoy si está en la semana, si no el lunes
    let selectedIdx = _days.findIndex(d => d.toDateString() === today.toDateString());
    if (selectedIdx === -1) selectedIdx = 0;

    const rangoLabel = `${mon.getDate()} ${MESES[mon.getMonth()]} — ${sun.getDate()} ${MESES[sun.getMonth()]} ${sun.getFullYear()}`;
    const semLabel   = isCurrentWeek ? 'Semana actual' : offset < 0 ? `Hace ${Math.abs(offset)} semana${Math.abs(offset)>1?'s':''}` : `En ${offset} semana${offset>1?'s':''}`;

    section.innerHTML = `
        <div class="week-nav">
            <button class="btn btn-ghost btn-sm" id="btnWeekPrev">‹ Anterior</button>
            <div class="week-nav-label">
                <span class="week-nav-title">${semLabel}</span>
                <span class="week-nav-range">${rangoLabel}</span>
            </div>
            <button class="btn btn-ghost btn-sm" id="btnWeekNext">Siguiente ›</button>
        </div>
        <div class="week-grid" id="weekGrid">
            ${_days.map((d, i) => buildDayCard(d, i, i === selectedIdx)).join('')}
        </div>
    `;

    renderDayTurnos(selectedIdx);

    document.getElementById('btnWeekPrev').addEventListener('click', () => renderWeek(offset - 1));
    document.getElementById('btnWeekNext').addEventListener('click', () => renderWeek(offset + 1));

    document.getElementById('weekGrid').addEventListener('click', e => {
        const card = e.target.closest('[data-day-idx]');
        if (!card) return;
        const idx = +card.dataset.dayIdx;
        document.querySelectorAll('.week-day').forEach((c, i) =>
            c.classList.toggle('selected', i === idx));
        renderDayTurnos(idx);
    });
}

const FILTER_LABEL = {
    pendiente:  { label: 'Pendientes',   color: 'var(--warning)' },
    en_proceso: { label: 'En Proceso',   color: 'var(--accent)'  },
    finalizado: { label: 'Finalizados',  color: 'var(--success)' },
    semana:     { label: 'Esta Semana',  color: 'var(--text)'    },
};

function renderStatPanel(filter) {
    const lista = filter === 'semana'
        ? _allTurnos.filter(t => {
              const { mon, sun } = weekRange();
              const d = new Date(t.fecha_hora);
              return d >= mon && d <= sun;
          })
        : _allTurnos.filter(t => t.estado === filter);

    const meta  = FILTER_LABEL[filter];
    const panel = document.getElementById('statPanel');

    if (!lista.length) {
        panel.innerHTML = `
            <div class="stat-panel" style="--panel-color:${meta.color}">
                <div class="stat-panel-header">
                    <span style="color:${meta.color};font-weight:700">${meta.label}</span>
                    <span style="font-size:.8rem;color:var(--text-muted)">0 turnos</span>
                </div>
                <div class="day-empty-pending">
                    <span class="day-empty-icon">✓</span>
                    <span>No hay turnos en esta categoría</span>
                </div>
            </div>`;
        return;
    }

    const rows = lista.map(t => {
        const fecha = new Date(t.fecha_hora).toLocaleDateString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const hora  = new Date(t.fecha_hora).toLocaleTimeString('es-AR', {
            hour: '2-digit', minute: '2-digit'
        });
        const cliente  = [t.clientes?.apellido, t.clientes?.nombre].filter(Boolean).join(', ') || '—';
        const vehiculo = [t.vehiculos?.patente, t.vehiculos?.marca, t.vehiculos?.modelo].filter(Boolean).join(' · ');
        return `
            <div class="stat-panel-row">
                <div class="stat-panel-fecha">
                    <span class="stat-panel-dia">${fecha}</span>
                    <span class="stat-panel-hora">${hora}</span>
                </div>
                <div class="stat-panel-info">
                    <span class="stat-panel-cliente">${cliente}</span>
                    <span class="stat-panel-vehiculo">${vehiculo}</span>
                </div>
                <div class="stat-panel-tareas">${t.tareas || '—'}</div>
                <div>${badge(t.estado)}</div>
            </div>`;
    }).join('');

    panel.innerHTML = `
        <div class="stat-panel" style="--panel-color:${meta.color}">
            <div class="stat-panel-header">
                <span style="color:${meta.color};font-weight:700">${meta.label}</span>
                <span style="font-size:.8rem;color:var(--text-muted)">${lista.length} turno${lista.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="stat-panel-list">${rows}</div>
        </div>`;
}

function animateCounters() {
    document.querySelectorAll('.stat-value').forEach(el => {
        const target = parseInt(el.textContent, 10);
        if (isNaN(target) || target === 0) return;
        const duration = 600;
        const start = performance.now();
        const tick = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target);
            if (progress < 1) requestAnimationFrame(tick);
        };
        el.textContent = '0';
        requestAnimationFrame(tick);
    });
}

function buildDayCard(d, idx, selected) {
    const today    = new Date(); today.setHours(0,0,0,0);
    const isToday  = d.toDateString() === today.toDateString();
    const count    = _turnos.filter(t => new Date(t.fecha_hora).toDateString() === d.toDateString()).length;
    const dotClass = count > 0 ? 'has-turnos' : '';

    return `<div class="week-day ${isToday ? 'today' : ''} ${selected ? 'selected' : ''} ${dotClass}"
                 data-day-idx="${idx}">
        <div class="week-day-header">${DIAS[d.getDay()]}</div>
        <div class="week-day-num">${d.getDate()}</div>
        ${count > 0
            ? `<div class="week-day-count">${count} turno${count !== 1 ? 's' : ''}</div>`
            : `<div class="week-day-empty">—</div>`
        }
    </div>`;
}

function renderDayTurnos(idx) {
    const d          = _days[idx];
    const dayStr     = d.toDateString();
    const todayStr   = new Date().toDateString();
    const esHoy      = dayStr === todayStr;

    const todosDia   = _turnos.filter(t => new Date(t.fecha_hora).toDateString() === dayStr);
    const pendientes = todosDia.filter(t => t.estado === 'pendiente');

    const label = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()].charAt(0).toUpperCase() + MESES[d.getMonth()].slice(1)}`;

    const content = pendientes.length
        ? `<div class="day-turnos-list">
            ${pendientes.map(t => `
                <div class="day-turno-card">
                    <div class="day-turno-time">
                        ${new Date(t.fecha_hora).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}
                    </div>
                    <div class="day-turno-info">
                        <div class="day-turno-cliente">${[t.clientes?.apellido, t.clientes?.nombre].filter(Boolean).join(', ') || '—'}</div>
                        <div class="day-turno-vehiculo">
                            ${t.vehiculos?.patente || ''} · ${t.vehiculos?.marca || ''} ${t.vehiculos?.modelo || ''}
                        </div>
                        ${t.tareas ? `<div class="day-turno-tareas">${t.tareas}</div>` : ''}
                    </div>
                </div>
            `).join('')}
           </div>`
        : `<div class="day-empty-pending">
               <span class="day-empty-icon">✓</span>
               <span>No hay turnos pendientes ${esHoy ? 'hoy' : 'este día'}</span>
           </div>`;

    document.getElementById('dayTurnos').innerHTML = `
        <div class="section-header" style="margin-top:24px;margin-bottom:12px">
            <h2 class="section-title">
                Turnos pendientes — ${label}
                ${todosDia.length > pendientes.length
                    ? `<small style="color:var(--text-muted);font-weight:400;font-size:.78rem;margin-left:8px">
                           (${todosDia.length - pendientes.length} en otro estado)
                       </small>`
                    : ''}
            </h2>
        </div>
        <div class="card">${content}</div>
    `;
}
