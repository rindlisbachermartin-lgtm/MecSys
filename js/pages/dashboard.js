// ============================================================
// MECSYS — Página: Dashboard
// ============================================================
import { supabase }   from '../supabase.js';
import { renderMain, setPageTitle, setTopbarActions,
         badge, fmtDate, spinner, fmtMoney, showToast } from '../ui.js';

const DIAS  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function weekRange() {
    const now  = new Date();
    const day  = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon  = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0,0,0,0);
    const sun  = new Date(mon); sun.setDate(mon.getDate() + 6);    sun.setHours(23,59,59,999);
    return { mon, sun };
}

// Datos en memoria para no re-fetchar al cambiar día
let _turnos = [];
let _days   = [];

export async function renderDashboard() {
    setPageTitle('Dashboard');
    setTopbarActions('');
    renderMain(spinner());

    const { mon, sun } = weekRange();

    const [{ data: turnos, error }, { data: allTurnos }] = await Promise.all([
        supabase.from('turnos').select(`
            id, fecha_hora, estado, tareas,
            clientes(nombre, telefono),
            vehiculos(patente, marca, modelo)
        `).gte('fecha_hora', mon.toISOString()).lte('fecha_hora', sun.toISOString()).order('fecha_hora'),
        supabase.from('turnos').select('estado')
    ]);

    if (error) {
        showToast('Error cargando turnos: ' + error.message, 'error');
        renderMain(`<p style="color:var(--danger)">${error.message}</p>`);
        return;
    }

    _turnos = turnos || [];

    // Construir array de 7 días
    _days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        return d;
    });

    // Estadísticas globales
    const conteo = { pendiente: 0, en_proceso: 0, finalizado: 0, cancelado: 0 };
    (allTurnos || []).forEach(t => { if (conteo[t.estado] !== undefined) conteo[t.estado]++; });

    // Día seleccionado por defecto: hoy (o lunes si hoy no está en la semana)
    const today = new Date(); today.setHours(0,0,0,0);
    let selectedIdx = _days.findIndex(d => d.toDateString() === today.toDateString());
    if (selectedIdx === -1) selectedIdx = 0;

    renderMain(`
        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-label">Pendientes</span>
                <span class="stat-value warning">${conteo.pendiente}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">En Proceso</span>
                <span class="stat-value accent">${conteo.en_proceso}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Finalizados</span>
                <span class="stat-value success">${conteo.finalizado}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Esta Semana</span>
                <span class="stat-value">${_turnos.length}</span>
            </div>
        </div>

        <!-- Semana -->
        <div class="section-header" style="margin-bottom:12px">
            <h2 class="section-title">Semana
                <small style="color:var(--text-muted);font-weight:400;font-size:.8rem;margin-left:8px">
                    ${mon.getDate()} ${MESES[mon.getMonth()]} — ${sun.getDate()} ${MESES[sun.getMonth()]} ${sun.getFullYear()}
                </small>
            </h2>
        </div>
        <div class="week-grid" id="weekGrid">
            ${_days.map((d, i) => buildDayCard(d, i, i === selectedIdx)).join('')}
        </div>

        <!-- Turnos del día seleccionado -->
        <div id="dayTurnos"></div>
    `);

    renderDayTurnos(selectedIdx);

    // Eventos de click en cada día
    document.getElementById('weekGrid').addEventListener('click', e => {
        const card = e.target.closest('[data-day-idx]');
        if (!card) return;
        const idx = +card.dataset.dayIdx;

        document.querySelectorAll('.week-day').forEach((c, i) =>
            c.classList.toggle('selected', i === idx));

        renderDayTurnos(idx);
    });
}

function buildDayCard(d, idx, selected) {
    const today    = new Date(); today.setHours(0,0,0,0);
    const isToday  = d.toDateString() === today.toDateString();
    const count    = _turnos.filter(t => new Date(t.fecha_hora).toDateString() === d.toDateString()).length;
    const dotClass = count > 0 ? 'has-turnos' : '';

    return `<div class="week-day ${isToday ? 'today' : ''} ${selected ? 'selected' : ''} ${dotClass}"
                 data-day-idx="${idx}" style="cursor:pointer">
        <div class="week-day-header">${DIAS[d.getDay()]}</div>
        <div class="week-day-num">${d.getDate()}</div>
        ${count > 0
            ? `<div class="week-day-count">${count} turno${count !== 1 ? 's' : ''}</div>`
            : `<div class="week-day-empty">—</div>`
        }
    </div>`;
}

function renderDayTurnos(idx) {
    const d       = _days[idx];
    const dayStr  = d.toDateString();
    const turnos  = _turnos.filter(t => new Date(t.fecha_hora).toDateString() === dayStr);

    const label = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()].charAt(0).toUpperCase() + MESES[d.getMonth()].slice(1)}`;

    const content = turnos.length
        ? `<div class="day-turnos-list">
            ${turnos.map(t => `
                <div class="day-turno-card">
                    <div class="day-turno-time">
                        ${new Date(t.fecha_hora).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}
                    </div>
                    <div class="day-turno-info">
                        <div class="day-turno-cliente">${t.clientes?.nombre || '—'}</div>
                        <div class="day-turno-vehiculo">
                            ${t.vehiculos?.patente || ''} · ${t.vehiculos?.marca || ''} ${t.vehiculos?.modelo || ''}
                        </div>
                        ${t.tareas ? `<div class="day-turno-tareas">${t.tareas}</div>` : ''}
                    </div>
                    <div>${badge(t.estado)}</div>
                </div>
            `).join('')}
           </div>`
        : `<div style="padding:24px 0;text-align:center;color:var(--text-muted);font-size:.875rem">
               Sin turnos agendados para este día
           </div>`;

    document.getElementById('dayTurnos').innerHTML = `
        <div class="section-header" style="margin-top:24px;margin-bottom:12px">
            <h2 class="section-title">Turnos — ${label}</h2>
        </div>
        <div class="card">${content}</div>
    `;
}
