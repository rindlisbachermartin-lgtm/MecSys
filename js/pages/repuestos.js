// ============================================================
// MECSYS — Página: Repuestos
// ============================================================
import { supabase } from '../supabase.js';
import {
    renderMain, setPageTitle, setTopbarActions,
    openModal, closeModal, showToast, spinner, emptyState, fmtMoney
} from '../ui.js';

const COMBUSTIBLES = ['cualquiera','nafta','diesel','gnc','eléctrico','híbrido'];

export async function renderRepuestos() {
    setPageTitle('Repuestos');
    setTopbarActions(`<button class="btn btn-primary" id="btnNuevoRep">+ Nuevo repuesto</button>`);
    renderMain(spinner());

    await loadRepuestos();

    document.getElementById('topbarActions')
        .querySelector('#btnNuevoRep')
        ?.addEventListener('click', () => openFormRepuesto());
}

async function loadRepuestos(search = '') {
    let query = supabase.from('repuestos').select('*').order('nombre');
    if (search) query = query.ilike('nombre', `%${search}%`);

    const { data, error } = await query;
    if (error) { showToast('Error cargando repuestos', 'error'); return; }

    const rows = data.length
        ? data.map(r => `
            <tr>
                <td style="color:var(--text-muted);font-size:.8rem">${r.codigo || '—'}</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.marca_compatible || '—'}</td>
                <td>${r.modelo_compatible || '—'}</td>
                <td>${r.anio_desde ? `${r.anio_desde}${r.anio_hasta ? '–'+r.anio_hasta : '+'}` : '—'}</td>
                <td>${r.combustible ? `<span class="badge badge-${r.combustible === 'cualquiera' ? 'pendiente' : 'en_proceso'}">${r.combustible}</span>` : '—'}</td>
                <td>${fmtMoney(r.precio_unitario)}</td>
                <td>
                    <span style="color:${r.stock > 5 ? 'var(--success)' : r.stock > 0 ? 'var(--warning)' : 'var(--danger)'}">
                        ${r.stock} ${r.unidad}
                    </span>
                </td>
                <td>
                    <button class="btn btn-ghost btn-sm" data-action="edit"   data-id="${r.id}">Editar</button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${r.id}" data-nombre="${r.nombre}">Eliminar</button>
                </td>
            </tr>`).join('')
        : `<tr><td colspan="9">${emptyState('No hay repuestos registrados')}</td></tr>`;

    renderMain(`
        <div class="filters">
            <input type="search" id="searchRep" placeholder="Buscar repuesto…" value="${search}">
        </div>
        <div class="table-wrapper">
            <table>
                <thead><tr>
                    <th>Código</th><th>Nombre</th><th>Marca compat.</th><th>Modelo compat.</th>
                    <th>Años</th><th>Combustible</th><th>Precio</th><th>Stock</th><th>Acciones</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `);

    document.getElementById('searchRep')
        ?.addEventListener('input', e => loadRepuestos(e.target.value));

    document.querySelectorAll('[data-action="edit"]')
        .forEach(b => b.addEventListener('click', () => openFormRepuesto(b.dataset.id)));

    document.querySelectorAll('[data-action="delete"]')
        .forEach(b => b.addEventListener('click', () => confirmDelete(b.dataset.id, b.dataset.nombre)));
}

function openFormRepuesto(id = null) {
    openModal(id ? 'Editar repuesto' : 'Nuevo repuesto', spinner(), '620px');
    if (id) {
        supabase.from('repuestos').select('*').eq('id', id).single()
            .then(({ data, error }) => {
                if (error) { showToast('Error', 'error'); return; }
                renderForm(id, data);
            });
    } else {
        renderForm(null, {});
    }
}

function renderForm(id, r) {
    const combustOpts = COMBUSTIBLES.map(c =>
        `<option value="${c}" ${(r.combustible||'cualquiera')===c?'selected':''}>${c}</option>`
    ).join('');

    const unidadOpts = ['unidad','litro','metro','kg','par','set'].map(u =>
        `<option value="${u}" ${(r.unidad||'unidad')===u?'selected':''}>${u}</option>`
    ).join('');

    document.getElementById('modalBody').innerHTML = `
        <form id="formRepuesto">
            <div class="form-grid cols-3">
                <div class="form-group">
                    <label>Código de repuesto</label>
                    <input type="text" name="codigo" value="${r.codigo||''}" placeholder="Ej: FR-4821">
                </div>
                <div class="form-group" style="grid-column:span 2">
                    <label>Nombre *</label>
                    <input type="text" name="nombre" value="${r.nombre||''}" required>
                </div>
                <div class="form-group full" style="grid-column:1/-1">
                    <label>Descripción</label>
                    <input type="text" name="descripcion" value="${r.descripcion||''}">
                </div>
            </div>

            <div style="margin:16px 0 8px;font-size:.78rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">
                Compatibilidad
            </div>
            <div class="form-grid cols-3">
                <div class="form-group">
                    <label>Marca compatible</label>
                    <input type="text" name="marca_compatible" value="${r.marca_compatible||''}" placeholder="Ej: Ford">
                </div>
                <div class="form-group">
                    <label>Modelo compatible</label>
                    <input type="text" name="modelo_compatible" value="${r.modelo_compatible||''}" placeholder="Ej: Focus">
                </div>
                <div class="form-group">
                    <label>Combustible</label>
                    <select name="combustible">${combustOpts}</select>
                </div>
                <div class="form-group">
                    <label>Año desde</label>
                    <input type="number" name="anio_desde" value="${r.anio_desde||''}" min="1900" max="2099" placeholder="Ej: 2010">
                </div>
                <div class="form-group">
                    <label>Año hasta</label>
                    <input type="number" name="anio_hasta" value="${r.anio_hasta||''}" min="1900" max="2099" placeholder="Ej: 2020">
                </div>
            </div>

            <div style="margin:16px 0 8px;font-size:.78rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">
                Precio y stock
            </div>
            <div class="form-grid cols-3">
                <div class="form-group">
                    <label>Precio unitario *</label>
                    <input type="number" name="precio_unitario" value="${r.precio_unitario||0}" min="0" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Stock</label>
                    <input type="number" name="stock" value="${r.stock??0}" min="0">
                </div>
                <div class="form-group">
                    <label>Unidad</label>
                    <select name="unidad">${unidadOpts}</select>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-ghost" id="cancelForm">Cancelar</button>
                <button type="submit" class="btn btn-primary">${id ? 'Guardar cambios' : 'Crear repuesto'}</button>
            </div>
        </form>
    `;

    document.getElementById('cancelForm').addEventListener('click', closeModal);
    document.getElementById('formRepuesto').addEventListener('submit', e => submitRepuesto(e, id));
}

async function submitRepuesto(e, id) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
        codigo:            fd.get('codigo').trim()            || null,
        nombre:            fd.get('nombre').trim(),
        descripcion:       fd.get('descripcion').trim()       || null,
        marca_compatible:  fd.get('marca_compatible').trim()  || null,
        modelo_compatible: fd.get('modelo_compatible').trim() || null,
        combustible:       fd.get('combustible'),
        anio_desde:        fd.get('anio_desde')  ? parseInt(fd.get('anio_desde'))  : null,
        anio_hasta:        fd.get('anio_hasta')  ? parseInt(fd.get('anio_hasta'))  : null,
        precio_unitario:   parseFloat(fd.get('precio_unitario')),
        stock:             parseInt(fd.get('stock'), 10),
        unidad:            fd.get('unidad'),
    };

    const { error } = id
        ? await supabase.from('repuestos').update(payload).eq('id', id)
        : await supabase.from('repuestos').insert(payload);

    if (error) { showToast('Error: ' + error.message, 'error'); return; }

    showToast(id ? 'Repuesto actualizado' : 'Repuesto creado', 'success');
    closeModal();
    loadRepuestos();
}

function confirmDelete(id, nombre) {
    openModal('Confirmar eliminación', `
        <p style="margin-bottom:20px">¿Eliminar el repuesto <strong>${nombre}</strong>?</p>
        <div class="form-actions">
            <button class="btn btn-ghost" id="cancelDel">Cancelar</button>
            <button class="btn btn-danger" id="confirmDel">Sí, eliminar</button>
        </div>
    `, '400px');

    document.getElementById('cancelDel').addEventListener('click', closeModal);
    document.getElementById('confirmDel').addEventListener('click', async () => {
        const { error } = await supabase.from('repuestos').delete().eq('id', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Repuesto eliminado', 'success');
        closeModal();
        loadRepuestos();
    });
}
