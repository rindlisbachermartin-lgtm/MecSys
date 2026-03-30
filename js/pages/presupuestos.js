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
            *, clientes(nombre, apellido, telefono, email), vehiculos(patente, marca, modelo, anio)
        `).eq('id', id).single(),
        supabase.from('presupuesto_items').select(`
            descripcion, cantidad, precio_unitario, repuestos(nombre)
        `).eq('presupuesto_id', id)
    ]);

    if (!p) { showToast('Error cargando presupuesto', 'error'); return; }

    const totalRep  = (items||[]).reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
    const subtotal  = totalRep + (p.mano_de_obra || 0);
    const ivaAmt    = p.incluye_iva ? subtotal * 0.21 : 0;
    const totalGen  = subtotal + ivaAmt;

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
                <div style="font-weight:600">${[p.clientes?.apellido, p.clientes?.nombre].filter(Boolean).join(', ') || '—'}</div>
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
            ${p.incluye_iva ? `
            <div class="total-row">
                <span>IVA (21%)</span>
                <span>${fmtMoney(ivaAmt)}</span>
            </div>` : ''}
            <div class="total-row grand">
                <span>TOTAL${p.incluye_iva ? ' c/IVA' : ''}</span>
                <span>${fmtMoney(totalGen)}</span>
            </div>
        </div>

        ${p.notas ? `<div style="margin-top:14px;font-size:.85rem;color:var(--text-muted)"><strong>Notas:</strong> ${p.notas}</div>` : ''}

        <div class="form-actions" style="margin-top:16px">
            <button class="btn btn-ghost" id="closeDet">Cerrar</button>
            <button class="btn btn-ghost" id="btnExportImg">📷 Guardar imagen</button>
            <button class="btn btn-primary" data-action="edit" data-id="${p.id}">Editar</button>
        </div>
    `;

    document.getElementById('closeDet').addEventListener('click', closeModal);
    document.getElementById('btnExportImg').addEventListener('click', () =>
        exportarImagenPresupuesto(p, items || []));
    document.querySelector('[data-action="edit"]')
        ?.addEventListener('click', () => { closeModal(); openFormPresupuesto(id); });
}

// ----- Formulario -----
async function openFormPresupuesto(id = null) {
    openModal(id ? 'Editar presupuesto' : 'Nuevo presupuesto', spinner(), '720px');

    const [{ data: clientes }, { data: repuestosDB }] = await Promise.all([
        supabase.from('clientes').select('id, nombre, apellido').order('apellido').order('nombre'),
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
        `<option value="${c.id}" ${pres.cliente_id===c.id?'selected':''}>${[c.apellido, c.nombre].filter(Boolean).join(', ')}</option>`
    ).join('');

    const vehiculoOpts = vehiculos.map(v =>
        `<option value="${v.id}" ${pres.vehiculo_id===v.id?'selected':''}>${v.patente} — ${v.marca} ${v.modelo}${v.anio ? ' ('+v.anio+')' : ''}</option>`
    ).join('');

    const estadoOpts = ESTADOS.map(e =>
        `<option value="${e}" ${(pres.estado||'borrador')===e?'selected':''}>${e}</option>`
    ).join('');

    const renderItems = () => {
        const container  = document.getElementById('presItemsContainer');
        const totalRepEl = document.getElementById('totalRepuestos');
        const totalGenEl = document.getElementById('totalGeneral');
        if (!container) return;

        const mdo       = parseFloat(document.querySelector('[name="mano_de_obra"]')?.value || 0);
        const conIva    = document.getElementById('chkIva')?.checked ?? false;
        const totalRep  = items.reduce((s, i) => s + (i.cantidad||0)*(i.precio_unitario||0), 0);
        const subtotal  = totalRep + mdo;
        const ivaAmt    = conIva ? subtotal * 0.21 : 0;
        const ivaRow    = document.getElementById('ivaRow');
        const ivaValEl  = document.getElementById('ivaVal');
        if (ivaRow)   ivaRow.style.display  = conIva ? '' : 'none';
        if (ivaValEl) ivaValEl.textContent   = fmtMoney(ivaAmt);
        if (totalRepEl) totalRepEl.textContent = fmtMoney(totalRep);
        if (totalGenEl) totalGenEl.textContent = fmtMoney(subtotal + ivaAmt);

        if (!items.length) {
            container.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:16px 0">
                Sin ítems. Buscá un repuesto o agregá uno manualmente.
            </p>`;
            return;
        }

        container.innerHTML = items.map((item, i) => {
            const sub = (item.cantidad||0)*(item.precio_unitario||0);
            return `<div class="item-row" data-index="${i}">
                <input type="text"   class="item-desc"   data-i="${i}" placeholder="Descripción" value="${item.descripcion||''}">
                <input type="number" class="item-cant"   data-i="${i}" value="${item.cantidad||1}" min="1" step="1">
                <input type="number" class="item-precio" data-i="${i}" value="${item.precio_unitario||0}" min="0" step="0.01">
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

    const showRepResults = (query) => {
        const box = document.getElementById('repResults');
        if (!box) return;
        const q = query.trim().toLowerCase();
        const lista = getCompatibles().filter(r =>
            !q ||
            r.nombre.toLowerCase().includes(q) ||
            (r.codigo || '').toLowerCase().includes(q)
        );
        if (!lista.length) { box.style.display = 'none'; return; }
        box.style.display = 'block';
        box.innerHTML = lista.map(r => {
            const universal = (!r.marca_compatible && !r.modelo_compatible);
            return `<div class="rep-result-item" data-id="${r.id}"
                        data-nombre="${r.nombre}" data-precio="${r.precio_unitario||0}">
                <span class="rep-result-nombre">${r.nombre}${r.codigo ? ` <small>(${r.codigo})</small>` : ''}</span>
                <span class="rep-result-right">
                    ${universal ? `<span class="rep-universal-tag">universal</span>` : ''}
                    <span class="rep-result-precio">${fmtMoney(r.precio_unitario)}</span>
                </span>
            </div>`;
        }).join('');

        box.querySelectorAll('.rep-result-item').forEach(el => {
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                items.push({
                    repuesto_id:    el.dataset.id,
                    descripcion:    el.dataset.nombre,
                    cantidad:       1,
                    precio_unitario: parseFloat(el.dataset.precio) || 0
                });
                document.getElementById('repSearch').value = '';
                box.style.display = 'none';
                renderItems();
            });
        });
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
                <div class="section-header" style="margin-bottom:10px">
                    <span style="font-size:.85rem;font-weight:600;color:var(--text-muted)">ÍTEMS</span>
                    <button type="button" class="btn btn-ghost btn-sm" id="btnAddItemManual">+ Manual</button>
                </div>

                <!-- Buscador de repuestos -->
                <div style="position:relative;margin-bottom:12px">
                    <input type="text" id="repSearch"
                           placeholder="Buscar repuesto compatible…"
                           style="width:100%;padding-left:34px">
                    <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);
                                 color:var(--text-muted);pointer-events:none;font-size:.95rem">🔍</span>
                    <div id="repResults" class="rep-results-dropdown" style="display:none"></div>
                </div>

                <!-- Cabecera de columnas -->
                <div class="item-row item-row-header">
                    <span>Descripción</span>
                    <span style="text-align:center">Cant.</span>
                    <span style="text-align:right">Precio u.</span>
                    <span style="text-align:right">Subtotal</span>
                    <span></span>
                </div>

                <div id="presItemsContainer"></div>
            </div>

            <!-- Mano de obra + totales -->
            <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">
                <div style="display:flex;flex-direction:column;gap:12px">
                    <div class="form-group">
                        <label>Mano de obra ($)</label>
                        <input type="number" name="mano_de_obra" id="mdoInput" value="${pres.mano_de_obra||0}" min="0" step="0.01">
                    </div>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;
                                  font-size:.875rem;font-weight:500;color:var(--text);
                                  text-transform:none;letter-spacing:0">
                        <input type="checkbox" id="chkIva" name="incluye_iva"
                               ${pres.incluye_iva ? 'checked' : ''}
                               style="width:16px;height:16px;accent-color:var(--accent);flex-shrink:0">
                        Aplicar IVA (21%)
                    </label>
                </div>
                <div class="total-box" style="margin-top:0">
                    <div class="total-row"><span>Repuestos</span><span id="totalRepuestos">${fmtMoney(0)}</span></div>
                    <div class="total-row"><span>Mano de obra</span><span>${fmtMoney(pres.mano_de_obra||0)}</span></div>
                    <div class="total-row" id="ivaRow" style="display:none">
                        <span>IVA (21%)</span><span id="ivaVal">${fmtMoney(0)}</span>
                    </div>
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

    // Buscador de repuestos
    const repSearch = document.getElementById('repSearch');
    const repResults = document.getElementById('repResults');
    repSearch?.addEventListener('input',  e => showRepResults(e.target.value));
    repSearch?.addEventListener('focus',  e => showRepResults(e.target.value));
    repSearch?.addEventListener('blur',   ()  => setTimeout(() => { if (repResults) repResults.style.display = 'none'; }, 150));

    document.getElementById('btnAddItemManual')?.addEventListener('click', () => {
        items.push({ repuesto_id: null, descripcion: '', cantidad: 1, precio_unitario: 0 });
        renderItems();
    });

    document.getElementById('mdoInput')?.addEventListener('input', renderItems);
    document.getElementById('chkIva')?.addEventListener('change', renderItems);
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
        incluye_iva:  fd.get('incluye_iva') === 'on',
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

// ============================================================
// EXPORTAR IMAGEN B&N
// ============================================================
async function exportarImagenPresupuesto(p, items) {
    const btn = document.getElementById('btnExportImg');
    btn.textContent = 'Generando…';
    btn.disabled = true;

    const tallerNombre    = localStorage.getItem('taller_nombre')    || 'Mi Taller';
    const tallerLogo      = localStorage.getItem('taller_logo')      || '';
    const tallerDireccion = localStorage.getItem('taller_direccion') || '';

    const totalRep = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);
    const mdo       = p.mano_de_obra || 0;
    const subtotal  = totalRep + mdo;
    const ivaAmt    = p.incluye_iva ? subtotal * 0.21 : 0;
    const totalGen  = subtotal + ivaAmt;

    const fechaStr = new Date(p.created_at).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const vencStr = (() => {
        const d = new Date(p.created_at);
        d.setDate(d.getDate() + (p.validez_dias || 15));
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    })();

    // Colores base — todo texto oscuro sobre blanco
    const C = { title: '#000', body: '#1a1a1a', sub: '#333', label: '#444', muted: '#555', border: '#bbb', bg2: '#f4f4f4' };

    const repRows = items.map((it, idx) => `
        <tr class="${idx % 2 !== 0 ? 'pq-row-alt' : ''}">
            <td style="padding:8px 10px;border-bottom:1px solid ${C.border}">${it.descripcion}</td>
            <td style="padding:8px 10px;border-bottom:1px solid ${C.border};text-align:center">${it.cantidad}</td>
            <td style="padding:8px 10px;border-bottom:1px solid ${C.border};text-align:right">${fmtMoney(it.precio_unitario)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid ${C.border};text-align:right;font-weight:700">${fmtMoney(it.cantidad * it.precio_unitario)}</td>
        </tr>`).join('');

    const mdoIdx = items.length;
    const mdoRow = mdo > 0 ? `
        <tr class="${mdoIdx % 2 !== 0 ? 'pq-row-alt' : ''}">
            <td style="padding:8px 10px;border-bottom:1px solid ${C.border};font-style:italic">Mano de obra</td>
            <td style="padding:8px 10px;border-bottom:1px solid ${C.border};text-align:center">1</td>
            <td style="padding:8px 10px;border-bottom:1px solid ${C.border};text-align:right">${fmtMoney(mdo)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid ${C.border};text-align:right;font-weight:700">${fmtMoney(mdo)}</td>
        </tr>` : '';

    const itemsHTML = (repRows || mdoRow)
        ? repRows + mdoRow
        : `<tr><td colspan="4" style="padding:12px;text-align:center;font-style:italic">Sin ítems</td></tr>`;

    const logoSrc  = tallerLogo || 'img/default-taller.svg';
    const logoHTML = `<img src="${logoSrc}" style="height:54px;width:54px;object-fit:cover;border-radius:6px;border:1px solid ${C.border}">`;

    const ivaRowHTML = p.incluye_iva ? `
        <div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid ${C.border}">
            <span style="color:${C.sub}">IVA (21%)</span>
            <span style="font-weight:600;color:${C.body}">${fmtMoney(ivaAmt)}</span>
        </div>` : '';

    const html = `
    <div id="pq-root" style="
        width: 680px;
        background: #fff;
        color: #1a1a1a;
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 13px;
        padding: 40px;
        box-sizing: border-box;
    ">
        <!-- CABECERA -->
        <div style="display:flex;justify-content:space-between;align-items:center;
                    border-bottom:2px solid ${C.title};padding-bottom:20px;margin-bottom:24px">
            <div style="display:flex;align-items:center;gap:14px">
                ${logoHTML}
                <div>
                    <div style="font-size:1.3rem;font-weight:800;letter-spacing:1px;color:${C.title}">${tallerNombre}</div>
                    <div style="font-size:.75rem;color:${C.label};margin-top:2px;text-transform:uppercase;letter-spacing:.5px">Taller Mecánico</div>
                    ${tallerDireccion ? `<div style="font-size:.75rem;color:${C.sub};margin-top:2px">${tallerDireccion}</div>` : ''}
                </div>
            </div>
            <div style="text-align:right">
                <div style="font-size:1.1rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:${C.title}">Presupuesto</div>
                <div style="font-size:.8rem;color:${C.sub};margin-top:4px">Fecha: ${fechaStr}</div>
                <div style="font-size:.8rem;color:${C.sub}">Válido hasta: ${vencStr}</div>
            </div>
        </div>

        <!-- CLIENTE Y VEHÍCULO -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
            <div style="border:1px solid ${C.border};border-radius:6px;padding:14px">
                <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;
                            letter-spacing:.8px;color:${C.label};margin-bottom:8px">Cliente</div>
                <div style="font-size:1rem;font-weight:700;color:${C.title}">${[p.clientes?.apellido, p.clientes?.nombre].filter(Boolean).join(', ') || '—'}</div>
                ${p.clientes?.telefono ? `<div style="font-size:.82rem;color:${C.sub};margin-top:3px">Tel: ${p.clientes.telefono}</div>` : ''}
                ${p.clientes?.email    ? `<div style="font-size:.82rem;color:${C.sub}">Email: ${p.clientes.email}</div>` : ''}
            </div>
            <div style="border:1px solid ${C.border};border-radius:6px;padding:14px">
                <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;
                            letter-spacing:.8px;color:${C.label};margin-bottom:8px">Vehículo</div>
                <div style="font-size:1rem;font-weight:700;color:${C.title}">${p.vehiculos?.patente || '—'}</div>
                <div style="font-size:.82rem;color:${C.sub};margin-top:3px">
                    ${p.vehiculos?.marca || ''} ${p.vehiculos?.modelo || ''} ${p.vehiculos?.anio ? '('+p.vehiculos.anio+')' : ''}
                </div>
            </div>
        </div>

        <!-- ÍTEMS -->
        <div style="margin-bottom:20px">
            <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;
                        letter-spacing:.8px;color:${C.label};margin-bottom:8px">Detalle de trabajos y repuestos</div>
            <table style="width:100%;border-collapse:collapse;font-size:.85rem">
                <thead>
                    <tr class="pq-thead-row">
                        <th style="padding:9px 10px;text-align:left;font-weight:600">Descripción</th>
                        <th style="padding:9px 10px;text-align:center;font-weight:600;width:60px">Cant.</th>
                        <th style="padding:9px 10px;text-align:right;font-weight:600;width:110px">Precio u.</th>
                        <th style="padding:9px 10px;text-align:right;font-weight:600;width:110px">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${itemsHTML}</tbody>
            </table>
        </div>

        <!-- TOTALES -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
            <div style="width:280px;border:1px solid ${C.border};border-radius:6px;overflow:hidden">
                <div style="display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid ${C.border}">
                    <span style="color:${C.sub}">Subtotal</span>
                    <span style="font-weight:600;color:${C.body}">${fmtMoney(subtotal)}</span>
                </div>
                ${ivaRowHTML}
                <div class="pq-total-grand" style="display:flex;justify-content:space-between;padding:11px 14px">
                    <span style="font-weight:700;font-size:1rem">TOTAL${p.incluye_iva ? ' c/IVA' : ''}</span>
                    <span style="font-weight:800;font-size:1rem">${fmtMoney(totalGen)}</span>
                </div>
            </div>
        </div>

        ${p.notas ? `
        <!-- NOTAS -->
        <div style="border:1px solid ${C.border};border-radius:6px;padding:12px 14px;margin-bottom:20px">
            <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;
                        letter-spacing:.8px;color:${C.label};margin-bottom:6px">Notas</div>
            <div style="font-size:.85rem;color:${C.body}">${p.notas}</div>
        </div>` : ''}

        <!-- PIE -->
        <div style="border-top:1px solid ${C.border};padding-top:14px;
                    display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:.72rem;color:${C.label}">
                Válido por ${p.validez_dias || 15} días desde la fecha de emisión.
            </div>
            <div style="font-size:.7rem;color:${C.muted};font-style:italic">Generado con MecSys</div>
        </div>
    </div>`;

    // Renderizar en iframe aislado para evitar herencia del CSS del tema oscuro
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:780px;height:1400px;border:none;z-index:-1';
    document.body.appendChild(iframe);

    const iDoc = iframe.contentDocument;
    iDoc.open();
    iDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#fff; color:#1a1a1a; font-family:'Segoe UI',Arial,sans-serif; }
        .pq-thead-row th { background:#000 !important; color:#fff !important; }
        .pq-row-alt { background:#f4f4f4 !important; }
        .pq-total-grand { background:#000 !important; }
        .pq-total-grand span { color:#fff !important; }
    </style></head><body>${html}</body></html>`);
    iDoc.close();

    // Esperar a que se pinte el iframe
    await new Promise(r => setTimeout(r, 150));

    try {
        const canvas = await window.html2canvas(iDoc.querySelector('#pq-root'), {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
        });

        const link = document.createElement('a');
        const clienteSlug = ([p.clientes?.apellido, p.clientes?.nombre].filter(Boolean).join('_') || 'cliente').replace(/\s+/g, '_').toLowerCase();
        link.download = `presupuesto_${clienteSlug}_${fechaStr.replace(/\//g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        showToast('Imagen guardada', 'success');
    } catch (err) {
        showToast('Error generando imagen: ' + err.message, 'error');
    } finally {
        document.body.removeChild(iframe);
        btn.textContent = '📷 Guardar imagen';
        btn.disabled = false;
    }
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
