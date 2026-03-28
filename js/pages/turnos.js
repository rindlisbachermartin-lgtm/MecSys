// ============================================================
// MECSYS — Página: Turnos
// ============================================================
import { supabase } from '../supabase.js';
import { currentUser } from '../auth.js';
import {
    renderMain, setPageTitle, setTopbarActions,
    openModal, closeModal, showToast, spinner,
    emptyState, badge, fmtDate, fmtMoney, applyPhoneMask
} from '../ui.js';

const ESTADOS = ['pendiente', 'en_proceso', 'finalizado', 'cancelado'];

export async function renderTurnos() {
    setPageTitle('Turnos');
    setTopbarActions(`<button class="btn btn-primary" id="btnNuevoTurno">+ Nuevo turno</button>`);
    renderMain(spinner());

    await loadTurnos();

    document.getElementById('topbarActions')
        .querySelector('#btnNuevoTurno')
        ?.addEventListener('click', () => openFormTurno());
}

async function loadTurnos(filtroEstado = '', search = '') {
    let query = supabase
        .from('turnos')
        .select(`
            id, fecha_hora, estado, tareas,
            clientes(id, nombre, telefono),
            vehiculos(id, patente, marca, modelo)
        `)
        .order('fecha_hora', { ascending: false });

    if (filtroEstado) query = query.eq('estado', filtroEstado);

    const { data, error } = await query;
    if (error) {
        showToast('Error cargando turnos', 'error');
        renderMain(`<p style="color:var(--danger)">${error.message}</p>`);
        return;
    }

    let turnos = data || [];
    if (search) {
        const s = search.toLowerCase();
        turnos = turnos.filter(t =>
            t.clientes?.nombre?.toLowerCase().includes(s) ||
            t.vehiculos?.patente?.toLowerCase().includes(s)
        );
    }

    const estadoOpts = (estado) => ESTADOS.map(e =>
        `<option value="${e}" ${estado === e ? 'selected' : ''}>${e.replace('_',' ')}</option>`
    ).join('');

    const rows = turnos.length
        ? turnos.map(t => `
            <tr>
                <td style="white-space:nowrap">${fmtDate(t.fecha_hora)}</td>
                <td>${t.clientes?.nombre || '—'}</td>
                <td>
                    <strong>${t.vehiculos?.patente || '—'}</strong><br>
                    <small style="color:var(--text-muted)">${t.vehiculos?.marca || ''} ${t.vehiculos?.modelo || ''}</small>
                </td>
                <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    ${t.tareas || '—'}
                </td>
                <td>
                    <select class="estado-select" data-id="${t.id}" title="Cambiar estado">
                        ${estadoOpts(t.estado)}
                    </select>
                </td>
                <td>
                    <button class="btn btn-ghost btn-sm" data-action="view"   data-id="${t.id}">Ver</button>
                    <button class="btn btn-ghost btn-sm" data-action="edit"   data-id="${t.id}">Editar</button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${t.id}">Eliminar</button>
                </td>
            </tr>`).join('')
        : `<tr><td colspan="6">${emptyState('No hay turnos registrados')}</td></tr>`;

    const filterOpts = ['', ...ESTADOS].map(e =>
        `<option value="${e}" ${filtroEstado===e?'selected':''}>${e || 'Todos los estados'}</option>`
    ).join('');

    renderMain(`
        <div class="filters">
            <input type="search" id="searchTurno" placeholder="Buscar cliente o patente…" value="${search}">
            <select id="filterEstado">${filterOpts}</select>
        </div>
        <div class="table-wrapper">
            <table>
                <thead><tr>
                    <th>Fecha/Hora</th><th>Cliente</th><th>Vehículo</th>
                    <th>Tareas</th><th>Estado</th><th>Acciones</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `);

    // Cambio de estado inline
    document.querySelectorAll('.estado-select').forEach(sel => {
        sel.addEventListener('change', async () => {
            const nuevoEstado = sel.value;
            const turnoId     = sel.dataset.id;

            const { error } = await supabase.from('turnos')
                .update({ estado: nuevoEstado }).eq('id', turnoId);
            if (error) { showToast('Error actualizando estado', 'error'); return; }
            showToast('Estado actualizado', 'success');

            if (nuevoEstado === 'finalizado') {
                offerWhatsApp(turnoId);
            }
        });
    });

    document.getElementById('searchTurno')
        ?.addEventListener('input', e => loadTurnos(
            document.getElementById('filterEstado').value, e.target.value));

    document.getElementById('filterEstado')
        ?.addEventListener('change', e => loadTurnos(
            e.target.value, document.getElementById('searchTurno').value));

    document.querySelectorAll('[data-action="view"]')
        .forEach(b => b.addEventListener('click', () => viewTurno(b.dataset.id)));

    document.querySelectorAll('[data-action="edit"]')
        .forEach(b => b.addEventListener('click', () => openFormTurno(b.dataset.id)));

    document.querySelectorAll('[data-action="delete"]')
        .forEach(b => b.addEventListener('click', () => confirmDelete(b.dataset.id)));
}

// ----- Detalle del turno -----
async function viewTurno(id) {
    openModal('Detalle del turno', spinner(), '660px');

    const [{ data: t }, { data: repuestos }] = await Promise.all([
        supabase.from('turnos').select(`*, clientes(*), vehiculos(*)`).eq('id', id).single(),
        supabase.from('turno_repuestos').select(`cantidad, precio_unitario, repuestos(nombre, codigo)`)
            .eq('turno_id', id)
    ]);

    if (!t) { showToast('Error cargando turno', 'error'); return; }

    const totalRep = (repuestos||[]).reduce((s, r) => s + r.cantidad * r.precio_unitario, 0);

    const repRows = (repuestos||[]).length
        ? (repuestos||[]).map(r => `
            <tr>
                <td>${r.repuestos?.codigo ? `<small style="color:var(--text-muted)">${r.repuestos.codigo}</small><br>` : ''}
                    ${r.repuestos?.nombre || '—'}</td>
                <td>${r.cantidad}</td>
                <td>${fmtMoney(r.precio_unitario)}</td>
                <td>${fmtMoney(r.cantidad * r.precio_unitario)}</td>
            </tr>`).join('')
        : `<tr><td colspan="4" style="color:var(--text-muted);font-style:italic">Sin repuestos</td></tr>`;

    document.getElementById('modalBody').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div>
                <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:4px">CLIENTE</div>
                <div style="font-weight:600">${t.clientes?.nombre}</div>
                <div style="font-size:.85rem;color:var(--text-muted)">${t.clientes?.telefono || ''}</div>
            </div>
            <div>
                <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:4px">VEHÍCULO</div>
                <div style="font-weight:600">${t.vehiculos?.patente}</div>
                <div style="font-size:.85rem;color:var(--text-muted)">${t.vehiculos?.marca} ${t.vehiculos?.modelo} ${t.vehiculos?.anio||''}</div>
            </div>
            <div>
                <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:4px">FECHA</div>
                <div>${fmtDate(t.fecha_hora)}</div>
            </div>
            <div>
                <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:4px">ESTADO</div>
                <div>${badge(t.estado)}</div>
            </div>
        </div>
        ${t.tareas ? `<div style="margin-bottom:16px">
            <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:6px">TAREAS</div>
            <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:.875rem">${t.tareas}</div>
        </div>` : ''}
        ${t.notas ? `<div style="margin-bottom:16px">
            <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:6px">NOTAS</div>
            <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:.875rem">${t.notas}</div>
        </div>` : ''}
        <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:8px">REPUESTOS</div>
        <div class="table-wrapper" style="margin-bottom:12px">
            <table>
                <thead><tr><th>Repuesto</th><th>Cant.</th><th>Precio u.</th><th>Subtotal</th></tr></thead>
                <tbody>${repRows}</tbody>
            </table>
        </div>
        ${(repuestos||[]).length ? `<div style="text-align:right;font-weight:600;color:var(--accent)">Total repuestos: ${fmtMoney(totalRep)}</div>` : ''}
        <div class="form-actions" style="margin-top:16px">
            <button class="btn btn-ghost" id="closeDet">Cerrar</button>
            <button class="btn btn-primary" data-action="edit" data-id="${t.id}">Editar turno</button>
        </div>
    `;

    document.getElementById('closeDet').addEventListener('click', closeModal);
    document.querySelector('[data-action="edit"]')
        ?.addEventListener('click', () => { closeModal(); openFormTurno(id); });
}

// Devuelve solo los repuestos compatibles con el vehículo dado,
// más los universales (sin marca/modelo definido).
function compatiblesConVehiculo(repuestos, vehiculo) {
    if (!vehiculo) return repuestos;
    return repuestos.filter(r => {
        const esUniversal = !r.marca_compatible && !r.modelo_compatible;
        if (esUniversal) return true;

        const marcaOk  = !r.marca_compatible  ||
            r.marca_compatible.toLowerCase()  === (vehiculo.marca  || '').toLowerCase();
        const modeloOk = !r.modelo_compatible ||
            r.modelo_compatible.toLowerCase() === (vehiculo.modelo || '').toLowerCase();
        const anioOk   =
            (!r.anio_desde || !vehiculo.anio || vehiculo.anio >= r.anio_desde) &&
            (!r.anio_hasta || !vehiculo.anio || vehiculo.anio <= r.anio_hasta);

        return marcaOk && modeloOk && anioOk;
    });
}

// ----- Formulario -----
async function openFormTurno(id = null) {
    openModal(id ? 'Editar turno' : 'Nuevo turno', spinner(), '700px');

    const [{ data: clientes }, { data: repuestosDB }] = await Promise.all([
        supabase.from('clientes').select('id, nombre, telefono').order('nombre'),
        supabase.from('repuestos')
            .select('id, nombre, codigo, precio_unitario, marca_compatible, modelo_compatible, anio_desde, anio_hasta')
            .order('nombre')
    ]);

    let turno = {};
    let turnoReps = [];
    let vehiculos = [];
    let vehiculoActual = null;

    if (id) {
        const [{ data: t }, { data: tr }] = await Promise.all([
            supabase.from('turnos').select('*').eq('id', id).single(),
            supabase.from('turno_repuestos').select('*').eq('turno_id', id)
        ]);
        turno = t || {};
        turnoReps = tr || [];
        if (turno.cliente_id) {
            const { data: v } = await supabase.from('vehiculos')
                .select('id, patente, marca, modelo, anio').eq('cliente_id', turno.cliente_id);
            vehiculos = v || [];
            vehiculoActual = vehiculos.find(v => v.id === turno.vehiculo_id) || null;
        }
    }

    const localISO = turno.fecha_hora
        ? new Date(turno.fecha_hora).toISOString().slice(0,16) : '';

    const clienteOpts = (clientes||[]).map(c =>
        `<option value="${c.id}" ${turno.cliente_id===c.id?'selected':''}>${c.nombre}</option>`
    ).join('');

    const vehiculoOpts = vehiculos.map(v =>
        `<option value="${v.id}" ${turno.vehiculo_id===v.id?'selected':''}>${v.patente} — ${v.marca} ${v.modelo}${v.anio ? ' ('+v.anio+')' : ''}</option>`
    ).join('');

    const estadoOpts = ESTADOS.map(e =>
        `<option value="${e}" ${(turno.estado||'pendiente')===e?'selected':''}>${e.replace('_',' ')}</option>`
    ).join('');

    const initItems = turnoReps.map(r => ({
        repuesto_id: r.repuesto_id, cantidad: r.cantidad, precio_unitario: r.precio_unitario
    }));

    renderTurnoForm({
        id, clientes, repuestosDB, vehiculos, vehiculoActual,
        vehiculoOpts, clienteOpts, estadoOpts, turno, localISO, initItems
    });
}

function renderTurnoForm({ id, clientes, repuestosDB, vehiculos, vehiculoActual,
                           vehiculoOpts, clienteOpts, estadoOpts, turno, localISO, initItems }) {
    let items = [...initItems];
    let currentVehiculo = vehiculoActual;

    // Mapa id→vehiculo para acceso rápido al cambiar selección
    let vehiculosMap = Object.fromEntries((vehiculos||[]).map(v => [v.id, v]));

    const buildRepOpts = (selectedId) => {
        const lista = compatiblesConVehiculo(repuestosDB || [], currentVehiculo);
        if (!lista.length) {
            return `<option value="">Sin repuestos compatibles</option>`;
        }
        return lista.map(r => {
            const tag = (!r.marca_compatible && !r.modelo_compatible) ? ' · universal' : '';
            return `<option value="${r.id}" data-precio="${r.precio_unitario}"
                        ${r.id === selectedId ? 'selected' : ''}>
                        ${r.nombre}${r.codigo ? ' ['+r.codigo+']' : ''}${tag}
                    </option>`;
        }).join('');
    };

    const renderItems = () => {
        const container = document.getElementById('repItemsContainer');
        if (!container) return;

        // Actualizar hint de compatibilidad
        const hintComp = document.getElementById('repCompatHint');
        if (hintComp) {
            const total = (repuestosDB||[]).length;
            const compat = compatiblesConVehiculo(repuestosDB||[], currentVehiculo).length;
            hintComp.textContent = currentVehiculo
                ? `${compat} de ${total} repuestos compatibles con este vehículo`
                : 'Seleccioná un vehículo para filtrar repuestos';
        }

        if (!items.length) {
            container.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:10px 0">Sin repuestos agregados</p>`;
            return;
        }
        container.innerHTML = items.map((item, i) => {
            const sub = (item.cantidad||0)*(item.precio_unitario||0);
            return `<div class="item-row" data-index="${i}">
                <select class="item-rep" data-i="${i}">${buildRepOpts(item.repuesto_id)}</select>
                <input type="number" class="item-cant"   data-i="${i}" value="${item.cantidad||1}" min="1" step="1">
                <input type="number" class="item-precio" data-i="${i}" value="${item.precio_unitario||0}" min="0" step="0.01">
                <div class="item-subtotal">${fmtMoney(sub)}</div>
                <button type="button" class="btn btn-danger btn-icon item-del" data-i="${i}">✕</button>
            </div>`;
        }).join('');

        container.querySelectorAll('.item-rep').forEach(s => s.addEventListener('change', () => {
            const opt = s.selectedOptions[0];
            items[+s.dataset.i].repuesto_id = s.value;
            items[+s.dataset.i].precio_unitario = parseFloat(opt.dataset.precio)||0;
            renderItems();
        }));
        container.querySelectorAll('.item-cant').forEach(inp => inp.addEventListener('input', () => {
            items[+inp.dataset.i].cantidad = parseFloat(inp.value)||0; renderItems();
        }));
        container.querySelectorAll('.item-precio').forEach(inp => inp.addEventListener('input', () => {
            items[+inp.dataset.i].precio_unitario = parseFloat(inp.value)||0; renderItems();
        }));
        container.querySelectorAll('.item-del').forEach(btn => btn.addEventListener('click', () => {
            items.splice(+btn.dataset.i, 1); renderItems();
        }));
    };

    document.getElementById('modalBody').innerHTML = `
        <form id="formTurno">
            <div class="form-grid">
                <div class="form-group">
                    <label>Cliente *</label>
                    <select name="cliente_id" id="fClienteId" required>
                        <option value="">— Seleccionar —</option>
                        ${clienteOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Vehículo *</label>
                    <select name="vehiculo_id" id="fVehiculoId" required>
                        <option value="">— Seleccionar cliente primero —</option>
                        ${vehiculoOpts}
                    </select>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Fecha y hora *</label>
                    <input type="datetime-local" name="fecha_hora" id="fFechaHora" value="${localISO}" required style="color-scheme:dark">
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select name="estado">${estadoOpts}</select>
                </div>
            </div>

            <!-- Hint de horarios ocupados -->
            <div id="horariosHint" style="margin-top:4px"></div>

            <div class="form-grid" style="margin-top:12px">
                <div class="form-group full">
                    <label>Tareas a realizar</label>
                    <textarea name="tareas" rows="3">${turno.tareas||''}</textarea>
                </div>
                <div class="form-group full">
                    <label>Notas internas</label>
                    <textarea name="notas" rows="2">${turno.notas||''}</textarea>
                </div>
            </div>

            <!-- Repuestos -->
            <div style="margin-top:16px">
                <div class="section-header" style="margin-bottom:6px">
                    <span style="font-size:.85rem;font-weight:600;color:var(--text-muted)">REPUESTOS UTILIZADOS</span>
                    <button type="button" class="btn btn-ghost btn-sm" id="btnAddItem">+ Agregar</button>
                </div>
                <p id="repCompatHint" style="font-size:.75rem;color:var(--text-muted);margin-bottom:8px"></p>
                <div id="repItemsContainer"></div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-ghost" id="cancelForm">Cancelar</button>
                <button type="submit" class="btn btn-primary">${id ? 'Guardar cambios' : 'Crear turno'}</button>
            </div>
        </form>
    `;

    renderItems();

    // Cambio de cliente → cargar vehículos y resetear vehículo actual
    document.getElementById('fClienteId')?.addEventListener('change', async e => {
        const cId = e.target.value;
        const sel = document.getElementById('fVehiculoId');
        currentVehiculo = null;
        vehiculosMap = {};
        if (!cId) { sel.innerHTML = `<option value="">— Seleccionar —</option>`; renderItems(); return; }

        const { data: vvs } = await supabase.from('vehiculos')
            .select('id, patente, marca, modelo, anio').eq('cliente_id', cId);

        vehiculosMap = Object.fromEntries((vvs||[]).map(v => [v.id, v]));

        sel.innerHTML = (vvs||[]).length
            ? vvs.map(v => `<option value="${v.id}">${v.patente} — ${v.marca} ${v.modelo}${v.anio ? ' ('+v.anio+')' : ''}</option>`).join('')
            : `<option value="">Sin vehículos registrados</option>`;

        // Auto-seleccionar el primero y filtrar
        if (vvs?.length) {
            currentVehiculo = vvs[0];
            renderItems();
        }
    });

    // Cambio de vehículo → actualizar filtro de repuestos
    document.getElementById('fVehiculoId')?.addEventListener('change', e => {
        currentVehiculo = vehiculosMap[e.target.value] || null;
        renderItems();
    });

    // Hint de horarios ocupados al cambiar la fecha
    document.getElementById('fFechaHora')?.addEventListener('change', async e => {
        const val = e.target.value;
        if (!val) return;
        const d = new Date(val);
        const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
        const dayEnd   = new Date(d); dayEnd.setHours(23,59,59,999);

        const { data: ocupados } = await supabase
            .from('turnos')
            .select('fecha_hora, clientes(nombre), vehiculos(patente)')
            .gte('fecha_hora', dayStart.toISOString())
            .lte('fecha_hora', dayEnd.toISOString())
            .neq('estado', 'cancelado')
            .order('fecha_hora');

        const hint = document.getElementById('horariosHint');
        const filtrados = (ocupados||[]).filter(t => !id || t.id !== id);

        if (!filtrados.length) {
            hint.innerHTML = `<div class="horarios-hint ok">✓ Sin turnos agendados para ese día</div>`;
        } else {
            const lista = filtrados.map(t =>
                `<span class="horario-chip">
                    ${new Date(t.fecha_hora).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}
                    ${t.clientes?.nombre?.split(' ')[0] || ''}
                 </span>`
            ).join('');
            hint.innerHTML = `<div class="horarios-hint warn">
                <strong>Turnos ya agendados ese día:</strong><br>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${lista}</div>
            </div>`;
        }
    });

    // Agregar item de repuesto
    document.getElementById('btnAddItem')?.addEventListener('click', () => {
        const first = repuestosDB?.[0];
        items.push({ repuesto_id: first?.id||null, cantidad:1, precio_unitario: first?.precio_unitario||0 });
        renderItems();
    });

    document.getElementById('cancelForm').addEventListener('click', closeModal);
    document.getElementById('formTurno').addEventListener('submit', e => submitTurno(e, id, items));
}

async function submitTurno(e, id, items) {
    e.preventDefault();
    const fd = new FormData(e.target);

    const payload = {
        cliente_id:  fd.get('cliente_id'),
        vehiculo_id: fd.get('vehiculo_id'),
        fecha_hora:  fd.get('fecha_hora'),
        estado:      fd.get('estado'),
        tareas:      fd.get('tareas').trim() || null,
        notas:       fd.get('notas').trim()  || null,
        user_id:     currentUser?.id ?? null,
    };

    let turnoId = id;

    if (id) {
        const { error } = await supabase.from('turnos').update(payload).eq('id', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
    } else {
        const { data, error } = await supabase.from('turnos').insert(payload).select().single();
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        turnoId = data.id;
    }

    // Sincronizar repuestos
    await supabase.from('turno_repuestos').delete().eq('turno_id', turnoId);
    const repRows = items.filter(i => i.repuesto_id).map(i => ({
        turno_id: turnoId, repuesto_id: i.repuesto_id,
        cantidad: i.cantidad, precio_unitario: i.precio_unitario
    }));
    if (repRows.length) {
        const { error } = await supabase.from('turno_repuestos').insert(repRows);
        if (error) showToast('Turno guardado, pero error en repuestos: ' + error.message, 'warning');
    }

    showToast(id ? 'Turno actualizado' : 'Turno creado', 'success');
    closeModal();
    loadTurnos();
}

// ============================================================
// WHATSAPP
// ============================================================

async function offerWhatsApp(turnoId) {
    const { data: t } = await supabase
        .from('turnos')
        .select('id, clientes(nombre, telefono), vehiculos(patente, marca, modelo)')
        .eq('id', turnoId)
        .single();

    if (!t?.clientes?.telefono) {
        showToast('El cliente no tiene teléfono registrado', 'warning');
        return;
    }

    const phone   = formatWAPhone(t.clientes.telefono);
    const nombre  = t.clientes.nombre;
    const patente = t.vehiculos?.patente || '';
    const vehiculo = `${t.vehiculos?.marca || ''} ${t.vehiculos?.modelo || ''}`.trim();

    const msgDefault =
        `Hola ${nombre}! Le informamos que su vehículo *${patente}*` +
        `${vehiculo ? ` (${vehiculo})` : ''} ya está listo para retirar del taller.` +
        ` Cualquier consulta estamos a su disposición. Muchas gracias!`;

    openModal('Notificar al cliente por WhatsApp', `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
                    background:var(--bg-input);border:1px solid var(--border);
                    border-radius:var(--radius-sm);margin-bottom:16px">
            <span style="font-size:1.8rem">📱</span>
            <div>
                <div style="font-weight:600">${nombre}</div>
                <div style="font-size:.85rem;color:var(--text-muted)">${t.clientes.telefono}
                    <span style="margin-left:8px;color:var(--text-muted);font-size:.75rem">→ +${phone}</span>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label>Mensaje (editable)</label>
            <textarea id="waMsgText" rows="5">${msgDefault}</textarea>
        </div>
        <div id="waStatus"></div>
        <div class="form-actions">
            <button class="btn btn-ghost" id="cancelWA">Ahora no</button>
            <button class="btn btn-success" id="sendWA">Enviar WhatsApp</button>
        </div>
    `, '500px');

    document.getElementById('cancelWA').addEventListener('click', closeModal);

    document.getElementById('sendWA').addEventListener('click', async () => {
        const msg = document.getElementById('waMsgText').value.trim();
        if (!msg) return;

        const btn    = document.getElementById('sendWA');
        const status = document.getElementById('waStatus');

        btn.disabled    = true;
        btn.textContent = 'Enviando…';
        status.innerHTML = '';

        const { data, error } = await supabase.functions.invoke('send-whatsapp', {
            body: { to: phone, message: msg }
        });

        btn.disabled    = false;
        btn.textContent = 'Enviar WhatsApp';

        if (error || data?.success === false) {
            const msg = data?.error || error?.message || 'Error desconocido';
            status.innerHTML = `<div class="horarios-hint warn" style="margin-bottom:8px">
                Error: ${msg}
            </div>`;
            return;
        }

        showToast(`WhatsApp enviado a ${nombre}`, 'success');
        closeModal();
    });
}

// Formatea número argentino para wa.me
// Entrada: "1234-567890"  →  Salida: "5491234567890"
function formatWAPhone(phone) {
    let d = phone.replace(/\D/g, '');          // solo dígitos
    if (d.startsWith('0'))  d = d.slice(1);    // quitar 0 inicial (ej: 0351...)
    if (d.startsWith('15')) d = d.slice(2);    // quitar 15 si lo ingresaron
    if (d.length <= 10)     d = '549' + d;     // agregar código Argentina + 9 (móvil)
    else if (d.startsWith('9'))  d = '54' + d;
    else if (!d.startsWith('54')) d = '54' + d;
    return d;
}

async function confirmDelete(id) {
    openModal('Confirmar eliminación', `
        <p style="margin-bottom:20px">¿Eliminar este turno?</p>
        <div class="form-actions">
            <button class="btn btn-ghost" id="cancelDel">Cancelar</button>
            <button class="btn btn-danger" id="confirmDel">Sí, eliminar</button>
        </div>
    `, '400px');

    document.getElementById('cancelDel').addEventListener('click', closeModal);
    document.getElementById('confirmDel').addEventListener('click', async () => {
        const { error } = await supabase.from('turnos').delete().eq('id', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Turno eliminado', 'success');
        closeModal();
        loadTurnos();
    });
}
