// ============================================================
// MECSYS — Página: Presupuestos
// ============================================================
import { supabase } from '../supabase.js';
import { currentUser } from '../auth.js';
import {
    renderMain, setPageTitle, setTopbarActions,
    openModal, closeModal, showToast, spinner,
    emptyState, badge, fmtDate, fmtMoney, fmtDateShort
} from '../ui.js';

const ESTADOS = ['borrador', 'aprobado', 'rechazado'];

export async function renderPresupuestos() {
    setPageTitle('Presupuestos');
    setTopbarActions(`<button class="btn btn-primary" id="btnNuevoPres">+ Nuevo presupuesto</button>`);
    renderMain(spinner());

    await loadPresupuestos();

    document.getElementById('topbarActions')
        .querySelector('#btnNuevoPres')
        ?.addEventListener('click', () => openFormPresupuesto());
}

async function loadPresupuestos(filtroEstado = '', search = '') {
    const { data, error } = await supabase
        .from('v_presupuestos_totales')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        showToast('Error cargando presupuestos', 'error');
        renderMain(`<p style="color:var(--danger)">${error.message}</p>`);
        return;
    }

    let lista = data || [];
    if (filtroEstado) lista = lista.filter(p => p.estado === filtroEstado);
    if (search) {
        const s = search.toLowerCase();
        lista = lista.filter(p =>
            p.cliente_nombre?.toLowerCase().includes(s) ||
            p.patente?.toLowerCase().includes(s)
        );
    }

    const rows = lista.length
        ? lista.map(p => `
            <tr>
                <td>${fmtDateShort(p.created_at)}</td>
                <td>${p.cliente_nombre || '—'}</td>
                <td>${p.patente || '—'}<br>
                    <small style="color:var(--text-muted)">${p.vehiculo || ''}</small>
                </td>
                <td>${fmtMoney(p.total_repuestos)}</td>
                <td>${fmtMoney(p.mano_de_obra)}</td>
                <td style="font-weight:700;color:var(--accent)">${fmtMoney(p.total_general)}</td>
                <td>${badge(p.estado)}</td>
                <td>
                    <button class="btn btn-ghost btn-sm"   data-action="view"   data-id="${p.id}">Ver</button>
                    <button class="btn btn-ghost btn-sm"   data-action="edit"   data-id="${p.id}">Editar</button>
                    <button class="btn btn-danger btn-sm"  data-action="delete" data-id="${p.id}">Eliminar</button>
                </td>
            </tr>`).join('')
        : `<tr><td colspan="8">${emptyState('No hay presupuestos registrados')}</td></tr>`;

    const estadoOpts = ['', ...ESTADOS].map(e =>
        `<option value="${e}" ${filtroEstado===e?'selected':''}>${e || 'Todos'}</option>`
    ).join('');

    renderMain(`
        <div class="filters">
            <input type="search" id="searchPres" placeholder="Buscar cliente o patente…" value="${search}">
            <select id="filterEstado">${estadoOpts}</select>
        </div>
        <div class="table-wrapper">
            <table>
                <thead><tr>
                    <th>Fecha</th><th>Cliente</th><th>Vehículo</th>
                    <th>Repuestos</th><th>Mano de obra</th><th>Total</th>
                    <th>Estado</th><th>Acciones</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `);

    document.getElementById('searchPres')
        ?.addEventListener('input', e => loadPresupuestos(
            document.getElementById('filterEstado').value, e.target.value));

    document.getElementById('filterEstado')
        ?.addEventListener('change', e => loadPresupuestos(
            e.target.value, document.getElementById('searchPres').value));

    document.querySelectorAll('[data-action="view"]')
        .forEach(b => b.addEventListener('click', () => viewPresupuesto(b.dataset.id)));

    document.querySelectorAll('[data-action="edit"]')
        .forEach(b => b.addEventListener('click', () => openFormPresupuesto(b.dataset.id)));

    document.querySelectorAll('[data-action="delete"]')
        .forEach(b => b.addEventListener('click', () => confirmDelete(b.dataset.id)));
}

// ----- Vista detalle -----
async function viewPresupuesto(id) {
    openModal('Presupuesto', spinner(), '680px');

    const [{ data: p }, { data: items }] = await Promise.all([
        supabase.from('presupuestos').select(`
            *, clientes(nombre, telefono, email), vehiculos(patente, marca, modelo, anio)
        `).eq('id', id).single(),
        supabase.from('presupuesto_items').select(`
            descripcion, cantidad, precio_unitario, repuestos(nombre)
        `).eq('presupuesto_id', id)
    ]);

    if (!p) { showToast('Error cargando presupuesto', 'error'); return; }

    const totalRep = (items||[]).reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
    const totalGen = totalRep + (p.mano_de_obra || 0);

    const itemRows = (items||[]).length
        ? (items||[]).map(i => `
            <tr>
                <td>${i.descripcion}</td>
                <td>${i.cantidad}</td>
                <td>${fmtMoney(i.precio_unitario)}</td>
                <td>${fmtMoney(i.cantidad * i.precio_unitario)}</td>
            </tr>`).join('')
        : `<tr><td colspan="4" style="color:var(--text-muted);font-style:italic">Sin ítems</td></tr>`;

    document.getElementById('modalBody').innerHTML = `
        <!-- Encabezado -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
            <div>
                <div class="stat-label" style="margin-bottom:4px">CLIENTE</div>
                <div style="font-weight:600">${p.clientes?.nombre}</div>
                <div style="font-size:.85rem;color:var(--text-muted)">${p.clientes?.telefono||''} ${p.clientes?.email?'· '+p.clientes.email:''}</div>
            </div>
            <div>
                <div class="stat-label" style="margin-bottom:4px">VEHÍCULO</div>
                <div style="font-weight:600">${p.vehiculos?.patente}</div>
                <div style="font-size:.85rem;color:var(--text-muted)">${p.vehiculos?.marca} ${p.vehiculos?.modelo} ${p.vehiculos?.anio||''}</div>
            </div>
            <div>
                <div class="stat-label" style="margin-bottom:4px">ESTADO</div>
                <div>${badge(p.estado)}</div>
            </div>
            <div>
                <div class="stat-label" style="margin-bottom:4px">FECHA / VALIDEZ</div>
                <div style="font-size:.875rem">${fmtDateShort(p.created_at)} · válido ${p.validez_dias} días</div>
            </div>
        </div>

        <!-- Items -->
        <div class="stat-label" style="margin-bottom:8px">ÍTEMS</div>
        <div class="table-wrapper" style="margin-bottom:16px">
            <table>
                <thead><tr><th>Descripción</th><th>Cant.</th><th>Precio u.</th><th>Subtotal</th></tr></thead>
                <tbody>${itemRows}</tbody>
            </table>
        </div>

        <!-- Totales -->
        <div class="total-box">
            <div class="total-row">
                <span>Total repuestos</span>
                <span>${fmtMoney(totalRep)}</span>
            </div>
            <div class="total-row">
                <span>Mano de obra</span>
                <span>${fmtMoney(p.mano_de_obra)}</span>
            </div>
            <div class="total-row grand">
                <span>TOTAL</span>
                <span>${fmtMoney(totalGen)}</span>
            </div>
        </div>

        ${p.notas ? `<div style="margin-top:14px;font-size:.85rem;color:var(--text-muted)"><strong>Notas:</strong> ${p.notas}</div>` : ''}

        <div class="form-actions" style="margin-top:16px">
            <button class="btn btn-ghost" id="closeDet">Cerrar</button>
            <button class="btn btn-primary" data-action="edit" data-id="${p.id}">Editar</button>
        </div>
    `;

    document.getElementById('closeDet').addEventListener('click', closeModal);
    document.querySelector('[data-action="edit"]')
        ?.addEventListener('click', () => { closeModal(); openFormPresupuesto(id); });
}

// ----- Formulario -----
async function openFormPresupuesto(id = null) {
    openModal(id ? 'Editar presupuesto' : 'Nuevo presupuesto', spinner(), '720px');

    const [{ data: clientes }, { data: repuestosDB }] = await Promise.all([
        supabase.from('clientes').select('id, nombre').order('nombre'),
        supabase.from('repuestos')
            .select('id, nombre, precio_unitario, marca_compatible, modelo_compatible, anio_desde, anio_hasta')
            .order('nombre')
    ]);

    let pres = {};
    let initItems = [];
    let vehiculos = [];
    let vehiculoActual = null;

    if (id) {
        const [{ data: p }, { data: pitems }] = await Promise.all([
            supabase.from('presupuestos').select('*').eq('id', id).single(),
            supabase.from('presupuesto_items').select('*').eq('presupuesto_id', id)
        ]);
        pres = p || {};
        initItems = (pitems || []).map(i => ({
            repuesto_id: i.repuesto_id, descripcion: i.descripcion,
            cantidad: i.cantidad, precio_unitario: i.precio_unitario
        }));
        if (pres.cliente_id) {
            const { data: vv } = await supabase.from('vehiculos')
                .select('id, patente, marca, modelo, anio').eq('cliente_id', pres.cliente_id);
            vehiculos = vv || [];
            vehiculoActual = vehiculos.find(v => v.id === pres.vehiculo_id) || null;
        }
    }

    renderPresupuestoForm({ id, clientes, repuestosDB, vehiculos, vehiculoActual, pres, initItems });
}

function renderPresupuestoForm({ id, clientes, repuestosDB, vehiculos, vehiculoActual, pres, initItems }) {
    let items = initItems.length ? [...initItems] : [];
    let currentVehiculo = vehiculoActual;
    let vehiculosMap = Object.fromEntries((vehiculos||[]).map(v => [v.id, v]));

    const getCompatibles = () => {
        // Reutiliza la misma función de turnos (definida en módulo global sería ideal,
        // pero la duplicamos aquí para mantener los módulos independientes)
        if (!currentVehiculo) return repuestosDB || [];
        return (repuestosDB || []).filter(r => {
            if (!r.marca_compatible && !r.modelo_compatible) return true;
            const marcaOk  = !r.marca_compatible  ||
                r.marca_compatible.toLowerCase()  === (currentVehiculo.marca  || '').toLowerCase();
            const modeloOk = !r.modelo_compatible ||
                r.modelo_compatible.toLowerCase() === (currentVehiculo.modelo || '').toLowerCase();
            const anioOk   =
                (!r.anio_desde || !currentVehiculo.anio || currentVehiculo.anio >= r.anio_desde) &&
                (!r.anio_hasta || !currentVehiculo.anio || currentVehiculo.anio <= r.anio_hasta);
            return marcaOk && modeloOk && anioOk;
        });
    };

    const clienteOpts = (clientes||[]).map(c =>
        `<option value="${c.id}" ${pres.cliente_id===c.id?'selected':''}>${c.nombre}</option>`
    ).join('');

    const vehiculoOpts = vehiculos.map(v =>
        `<option value="${v.id}" ${pres.vehiculo_id===v.id?'selected':''}>${v.patente} — ${v.marca} ${v.modelo}${v.anio ? ' ('+v.anio+')' : ''}</option>`
    ).join('');

    const estadoOpts = ESTADOS.map(e =>
        `<option value="${e}" ${(pres.estado||'borrador')===e?'selected':''}>${e}</option>`
    ).join('');

    const buildQuickOpts = () => {
        const lista = getCompatibles();
        return lista.map(r => {
            const tag = (!r.marca_compatible && !r.modelo_compatible) ? ' · universal' : '';
            return `<option value="${r.id}" data-precio="${r.precio_unitario}" data-nombre="${r.nombre}">
                ${r.nombre}${tag} — ${fmtMoney(r.precio_unitario)}
            </option>`;
        }).join('');
    };

    const renderItems = () => {
        const container = document.getElementById('presItemsContainer');
        const totalRepEl = document.getElementById('totalRepuestos');
        const totalGenEl = document.getElementById('totalGeneral');
        const hintComp   = document.getElementById('presCompatHint');
        const quickSel   = document.getElementById('quickAddRep');
        if (!container) return;

        // Actualizar selector de catálogo con repuestos filtrados
        if (quickSel) {
            const cur = quickSel.value;
            quickSel.innerHTML = `<option value="">Agregar desde catálogo…</option>${buildQuickOpts()}`;
            quickSel.value = cur;
        }

        // Hint de compatibilidad
        if (hintComp) {
            const total  = (repuestosDB||[]).length;
            const compat = getCompatibles().length;
            hintComp.textContent = currentVehiculo
                ? `Mostrando ${compat} de ${total} repuestos compatibles con este vehículo`
                : 'Seleccioná un vehículo para filtrar el catálogo';
        }

        const mdo = parseFloat(document.querySelector('[name="mano_de_obra"]')?.value || 0);
        const totalRep = items.reduce((s, i) => s + (i.cantidad||0)*(i.precio_unitario||0), 0);
        if (totalRepEl) totalRepEl.textContent = fmtMoney(totalRep);
        if (totalGenEl) totalGenEl.textContent = fmtMoney(totalRep + mdo);

        if (!items.length) {
            container.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:12px 0">Sin ítems. Agregá desde el catálogo o manualmente.</p>`;
            return;
        }

        container.innerHTML = items.map((item, i) => {
            const sub = (item.cantidad||0)*(item.precio_unitario||0);
            return `<div class="item-row" style="grid-template-columns:1fr 80px 110px auto 36px" data-index="${i}">
                <input type="text" class="item-desc"   data-i="${i}" placeholder="Descripción" value="${item.descripcion||''}">
                <input type="number" class="item-cant" data-i="${i}" value="${item.cantidad||1}" min="1" step="1" placeholder="Cant.">
                <input type="number" class="item-precio" data-i="${i}" value="${item.precio_unitario||0}" min="0" step="0.01" placeholder="Precio">
                <div class="item-subtotal">${fmtMoney(sub)}</div>
                <button type="button" class="btn btn-danger btn-icon item-del" data-i="${i}">✕</button>
            </div>`;
        }).join('');

        container.querySelectorAll('.item-desc').forEach(inp =>
            inp.addEventListener('input', () => { items[+inp.dataset.i].descripcion = inp.value; }));
        container.querySelectorAll('.item-cant').forEach(inp =>
            inp.addEventListener('input', () => { items[+inp.dataset.i].cantidad = parseFloat(inp.value)||0; renderItems(); }));
        container.querySelectorAll('.item-precio').forEach(inp =>
            inp.addEventListener('input', () => { items[+inp.dataset.i].precio_unitario = parseFloat(inp.value)||0; renderItems(); }));
        container.querySelectorAll('.item-del').forEach(btn =>
            btn.addEventListener('click', () => { items.splice(+btn.dataset.i, 1); renderItems(); }));
    };

    document.getElementById('modalBody').innerHTML = `
        <form id="formPresupuesto">
            <div class="form-grid">
                <div class="form-group">
                    <label>Cliente *</label>
                    <select name="cliente_id" id="fpClienteId" required>
                        <option value="">— Seleccionar —</option>
                        ${clienteOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Vehículo *</label>
                    <select name="vehiculo_id" id="fpVehiculoId" required>
                        <option value="">— Seleccionar cliente primero —</option>
                        ${vehiculoOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select name="estado">${estadoOpts}</select>
                </div>
                <div class="form-group">
                    <label>Validez (días)</label>
                    <input type="number" name="validez_dias" value="${pres.validez_dias||15}" min="1">
                </div>
                <div class="form-group full">
                    <label>Notas</label>
                    <textarea name="notas" rows="2">${pres.notas||''}</textarea>
                </div>
            </div>

            <!-- Ítems -->
            <div style="margin-top:18px">
                <div class="section-header" style="margin-bottom:4px">
                    <span style="font-size:.85rem;font-weight:600;color:var(--text-muted)">ÍTEMS</span>
                    <div style="display:flex;gap:8px">
                        <select id="quickAddRep" style="width:auto;font-size:.8rem;padding:5px 10px">
                            <option value="">Agregar desde catálogo…</option>
                        </select>
                        <button type="button" class="btn btn-ghost btn-sm" id="btnAddItemManual">+ Manual</button>
                    </div>
                </div>
                <p id="presCompatHint" style="font-size:.75rem;color:var(--text-muted);margin-bottom:8px"></p>
                <div id="presItemsContainer"></div>
            </div>

            <!-- Mano de obra + totales -->
            <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">
                <div class="form-group">
                    <label>Mano de obra ($)</label>
                    <input type="number" name="mano_de_obra" id="mdoInput" value="${pres.mano_de_obra||0}" min="0" step="0.01">
                </div>
                <div class="total-box" style="margin-top:22px">
                    <div class="total-row"><span>Repuestos</span><span id="totalRepuestos">${fmtMoney(0)}</span></div>
                    <div class="total-row"><span>Mano de obra</span><span>${fmtMoney(pres.mano_de_obra||0)}</span></div>
                    <div class="total-row grand"><span>TOTAL</span><span id="totalGeneral">${fmtMoney(pres.mano_de_obra||0)}</span></div>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-ghost" id="cancelForm">Cancelar</button>
                <button type="submit" class="btn btn-primary">${id ? 'Guardar cambios' : 'Crear presupuesto'}</button>
            </div>
        </form>
    `;

    renderItems();

    // Cliente → cargar vehículos
    document.getElementById('fpClienteId')?.addEventListener('change', async e => {
        const cId = e.target.value;
        const sel = document.getElementById('fpVehiculoId');
        currentVehiculo = null;
        vehiculosMap = {};
        if (!cId) { sel.innerHTML = `<option value="">— Seleccionar —</option>`; renderItems(); return; }

        const { data: vvs } = await supabase.from('vehiculos')
            .select('id, patente, marca, modelo, anio').eq('cliente_id', cId);
        vehiculosMap = Object.fromEntries((vvs||[]).map(v => [v.id, v]));
        sel.innerHTML = (vvs||[]).length
            ? vvs.map(v => `<option value="${v.id}">${v.patente} — ${v.marca} ${v.modelo}${v.anio ? ' ('+v.anio+')' : ''}</option>`).join('')
            : `<option value="">Sin vehículos</option>`;
        if (vvs?.length) { currentVehiculo = vvs[0]; renderItems(); }
    });

    // Vehículo → actualizar filtro
    document.getElementById('fpVehiculoId')?.addEventListener('change', e => {
        currentVehiculo = vehiculosMap[e.target.value] || null;
        renderItems();
    });

    // Quick add desde catálogo filtrado
    document.getElementById('quickAddRep')?.addEventListener('change', e => {
        const opt = e.target.selectedOptions[0];
        if (!opt.value) return;
        items.push({
            repuesto_id: opt.value,
            descripcion: opt.dataset.nombre,
            cantidad: 1,
            precio_unitario: parseFloat(opt.dataset.precio) || 0
        });
        e.target.value = '';
        renderItems();
    });

    document.getElementById('btnAddItemManual')?.addEventListener('click', () => {
        items.push({ repuesto_id: null, descripcion: '', cantidad: 1, precio_unitario: 0 });
        renderItems();
    });

    document.getElementById('mdoInput')?.addEventListener('input', renderItems);
    document.getElementById('cancelForm').addEventListener('click', closeModal);
    document.getElementById('formPresupuesto').addEventListener('submit', e => submitPresupuesto(e, id, items));
}

async function submitPresupuesto(e, id, items) {
    e.preventDefault();
    const fd = new FormData(e.target);

    const payload = {
        cliente_id:   fd.get('cliente_id'),
        vehiculo_id:  fd.get('vehiculo_id'),
        mano_de_obra: parseFloat(fd.get('mano_de_obra')) || 0,
        estado:       fd.get('estado'),
        validez_dias: parseInt(fd.get('validez_dias'), 10) || 15,
        notas:        fd.get('notas').trim() || null,
        user_id:      currentUser?.id ?? null,
    };

    let presId = id;

    if (id) {
        const { error } = await supabase.from('presupuestos').update(payload).eq('id', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
    } else {
        const { data, error } = await supabase.from('presupuestos').insert(payload).select().single();
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        presId = data.id;
    }

    // Sincronizar ítems
    await supabase.from('presupuesto_items').delete().eq('presupuesto_id', presId);
    const validItems = items.filter(i => i.descripcion?.trim());
    if (validItems.length) {
        const rows = validItems.map(i => ({
            presupuesto_id:  presId,
            repuesto_id:     i.repuesto_id || null,
            descripcion:     i.descripcion,
            cantidad:        i.cantidad,
            precio_unitario: i.precio_unitario
        }));
        const { error } = await supabase.from('presupuesto_items').insert(rows);
        if (error) showToast('Presupuesto guardado, pero error en ítems: ' + error.message, 'warning');
    }

    showToast(id ? 'Presupuesto actualizado' : 'Presupuesto creado', 'success');
    closeModal();
    loadPresupuestos();
}

async function confirmDelete(id) {
    openModal('Confirmar eliminación', `
        <p style="margin-bottom:20px">¿Eliminar este presupuesto?</p>
        <div class="form-actions">
            <button class="btn btn-ghost" id="cancelDel">Cancelar</button>
            <button class="btn btn-danger" id="confirmDel">Sí, eliminar</button>
        </div>
    `, '400px');

    document.getElementById('cancelDel').addEventListener('click', closeModal);
    document.getElementById('confirmDel').addEventListener('click', async () => {
        const { error } = await supabase.from('presupuestos').delete().eq('id', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Presupuesto eliminado', 'success');
        closeModal();
        loadPresupuestos();
    });
}
