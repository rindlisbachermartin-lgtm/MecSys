// ============================================================
// MECSYS — Página: Clientes
// ============================================================
import { supabase } from '../supabase.js';
import {
    renderMain, setPageTitle, setTopbarActions,
    openModal, closeModal, showToast, spinner, emptyState, fmtDateShort,
    applyPhoneMask
} from '../ui.js';

export async function renderClientes() {
    setPageTitle('Clientes');
    setTopbarActions(`<button class="btn btn-primary" id="btnNuevoCliente">+ Nuevo cliente</button>`);
    renderMain(spinner());

    await loadClientes();

    document.getElementById('topbarActions')
        .querySelector('#btnNuevoCliente')
        ?.addEventListener('click', () => openFormCliente());
}

async function loadClientes(search = '') {
    let query = supabase
        .from('clientes')
        .select('id, nombre, telefono, email, created_at')
        .order('nombre');

    if (search) query = query.ilike('nombre', `%${search}%`);

    const { data, error } = await query;

    if (error) {
        showToast('Error cargando clientes', 'error');
        renderMain(`<p style="color:var(--danger)">${error.message}</p>`);
        return;
    }

    // Contar vehículos por cliente
    const { data: vCounts } = await supabase
        .from('vehiculos')
        .select('cliente_id');
    const vcMap = {};
    (vCounts || []).forEach(v => { vcMap[v.cliente_id] = (vcMap[v.cliente_id] || 0) + 1; });

    const rows = data.length
        ? data.map(c => `
            <tr>
                <td>${c.nombre}</td>
                <td>${c.telefono || '—'}</td>
                <td>${c.email || '—'}</td>
                <td>
                    <button class="btn btn-ghost btn-sm" data-action="autos" data-id="${c.id}" data-nombre="${c.nombre}">
                        🚗 ${vcMap[c.id] || 0} vehículo${(vcMap[c.id] || 0) !== 1 ? 's' : ''}
                    </button>
                </td>
                <td>${fmtDateShort(c.created_at)}</td>
                <td>
                    <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${c.id}">Editar</button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-id="${c.id}" data-nombre="${c.nombre}">Eliminar</button>
                </td>
            </tr>`).join('')
        : `<tr><td colspan="6">${emptyState('No hay clientes registrados')}</td></tr>`;

    renderMain(`
        <div class="filters">
            <input type="search" id="searchCliente" placeholder="Buscar por nombre…" value="${search}">
        </div>
        <div class="table-wrapper">
            <table>
                <thead><tr>
                    <th>Nombre</th><th>Teléfono</th><th>Email</th>
                    <th>Vehículos</th><th>Registrado</th><th>Acciones</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `);

    // Eventos
    document.getElementById('searchCliente')
        ?.addEventListener('input', e => loadClientes(e.target.value));

    document.querySelectorAll('[data-action="autos"]')
        .forEach(b => b.addEventListener('click', () => openVehiculos(b.dataset.id, b.dataset.nombre)));

    document.querySelectorAll('[data-action="edit"]')
        .forEach(b => b.addEventListener('click', () => openFormCliente(b.dataset.id)));

    document.querySelectorAll('[data-action="delete"]')
        .forEach(b => b.addEventListener('click', () => confirmDelete(b.dataset.id, b.dataset.nombre)));
}

function openFormCliente(id = null) {
    const title = id ? 'Editar cliente' : 'Nuevo cliente';
    openModal(title, spinner());

    if (id) {
        supabase.from('clientes').select('*').eq('id', id).single()
            .then(({ data, error }) => {
                if (error) { showToast('Error cargando datos', 'error'); return; }
                renderForm(id, data);
            });
    } else {
        renderForm(null, {});
    }
}

function renderForm(id, c) {
    document.getElementById('modalBody').innerHTML = `
        <form id="formCliente">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Nombre completo *</label>
                    <input type="text" name="nombre" value="${c.nombre || ''}" required>
                </div>
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="tel" name="telefono" value="${c.telefono || ''}">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value="${c.email || ''}">
                </div>
                <div class="form-group full">
                    <label>Dirección</label>
                    <input type="text" name="direccion" value="${c.direccion || ''}">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-ghost" id="cancelForm">Cancelar</button>
                <button type="submit" class="btn btn-primary">${id ? 'Guardar cambios' : 'Crear cliente'}</button>
            </div>
        </form>
    `;

    // Aplicar máscara de teléfono
    const telInput = document.querySelector('[name="telefono"]');
    if (telInput) applyPhoneMask(telInput);

    document.getElementById('cancelForm').addEventListener('click', closeModal);
    document.getElementById('formCliente').addEventListener('submit', e => submitCliente(e, id));
}

async function submitCliente(e, id) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
        nombre:    fd.get('nombre').trim(),
        telefono:  fd.get('telefono').trim() || null,
        email:     fd.get('email').trim()    || null,
        direccion: fd.get('direccion').trim()|| null,
    };

    const { error } = id
        ? await supabase.from('clientes').update(payload).eq('id', id)
        : await supabase.from('clientes').insert(payload);

    if (error) { showToast('Error: ' + error.message, 'error'); return; }

    showToast(id ? 'Cliente actualizado' : 'Cliente creado', 'success');
    closeModal();
    loadClientes();
}

// ============================================================
// VEHÍCULOS
// ============================================================

async function openVehiculos(clienteId, clienteNombre) {
    openModal(`Vehículos — ${clienteNombre}`, spinner(), '680px');
    await loadVehiculos(clienteId, clienteNombre);
}

async function loadVehiculos(clienteId, clienteNombre) {
    const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('patente');

    if (error) { showToast('Error cargando vehículos', 'error'); return; }

    const rows = data.length
        ? data.map(v => `
            <tr>
                <td><strong>${v.patente}</strong></td>
                <td>${v.marca}</td>
                <td>${v.modelo}</td>
                <td>${v.anio || '—'}</td>
                <td>${v.color || '—'}</td>
                <td>
                    <button class="btn btn-ghost btn-sm" data-action="editv" data-id="${v.id}">Editar</button>
                    <button class="btn btn-danger btn-sm" data-action="deletev" data-id="${v.id}" data-patente="${v.patente}">Eliminar</button>
                </td>
            </tr>`).join('')
        : `<tr><td colspan="6" style="color:var(--text-muted);text-align:center;padding:20px">
               Sin vehículos registrados
           </td></tr>`;

    document.getElementById('modalBody').innerHTML = `
        <div style="margin-bottom:14px;display:flex;justify-content:flex-end">
            <button class="btn btn-primary btn-sm" id="btnNuevoVeh">+ Nuevo vehículo</button>
        </div>
        <div class="table-wrapper">
            <table>
                <thead><tr>
                    <th>Patente</th><th>Marca</th><th>Modelo</th>
                    <th>Año</th><th>Color</th><th>Acciones</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <div class="form-actions" style="margin-top:16px">
            <button class="btn btn-ghost" id="cerrarVeh">Cerrar</button>
        </div>
    `;

    document.getElementById('cerrarVeh').addEventListener('click', closeModal);
    document.getElementById('btnNuevoVeh').addEventListener('click', () =>
        openFormVehiculo(null, clienteId, clienteNombre));

    document.querySelectorAll('[data-action="editv"]')
        .forEach(b => b.addEventListener('click', () =>
            openFormVehiculo(b.dataset.id, clienteId, clienteNombre)));

    document.querySelectorAll('[data-action="deletev"]')
        .forEach(b => b.addEventListener('click', () =>
            confirmDeleteVehiculo(b.dataset.id, b.dataset.patente, clienteId, clienteNombre)));
}

function openFormVehiculo(id, clienteId, clienteNombre) {
    if (id) {
        supabase.from('vehiculos').select('*').eq('id', id).single()
            .then(({ data, error }) => {
                if (error) { showToast('Error cargando vehículo', 'error'); return; }
                renderFormVehiculo(id, data, clienteId, clienteNombre);
            });
    } else {
        renderFormVehiculo(null, {}, clienteId, clienteNombre);
    }
}

function renderFormVehiculo(id, v, clienteId, clienteNombre) {
    document.getElementById('modalTitle').textContent = id ? 'Editar vehículo' : 'Nuevo vehículo';
    document.getElementById('modalBody').innerHTML = `
        <form id="formVehiculo">
            <div class="form-grid cols-3">
                <div class="form-group">
                    <label>Patente *</label>
                    <input type="text" name="patente" value="${v.patente || ''}"
                           placeholder="Ej: ABC123" style="text-transform:uppercase" required>
                </div>
                <div class="form-group">
                    <label>Marca *</label>
                    <input type="text" name="marca" value="${v.marca || ''}" required>
                </div>
                <div class="form-group">
                    <label>Modelo *</label>
                    <input type="text" name="modelo" value="${v.modelo || ''}" required>
                </div>
                <div class="form-group">
                    <label>Año</label>
                    <input type="number" name="anio" value="${v.anio || ''}"
                           min="1900" max="${new Date().getFullYear() + 1}" placeholder="${new Date().getFullYear()}">
                </div>
                <div class="form-group">
                    <label>Color</label>
                    <input type="text" name="color" value="${v.color || ''}">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-ghost" id="backToList">← Volver</button>
                <button type="submit" class="btn btn-primary">${id ? 'Guardar cambios' : 'Agregar vehículo'}</button>
            </div>
        </form>
    `;

    document.getElementById('backToList').addEventListener('click', () =>
        loadVehiculos(clienteId, clienteNombre));

    document.getElementById('formVehiculo').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
            cliente_id: clienteId,
            patente:    fd.get('patente').trim().toUpperCase(),
            marca:      fd.get('marca').trim(),
            modelo:     fd.get('modelo').trim(),
            anio:       fd.get('anio') ? parseInt(fd.get('anio'), 10) : null,
            color:      fd.get('color').trim() || null,
        };

        const { error } = id
            ? await supabase.from('vehiculos').update(payload).eq('id', id)
            : await supabase.from('vehiculos').insert(payload);

        if (error) { showToast('Error: ' + error.message, 'error'); return; }

        showToast(id ? 'Vehículo actualizado' : 'Vehículo agregado', 'success');
        loadVehiculos(clienteId, clienteNombre);
        loadClientes(); // actualiza contador en la tabla
    });
}

function confirmDeleteVehiculo(id, patente, clienteId, clienteNombre) {
    const originalBody = document.getElementById('modalBody').innerHTML;
    document.getElementById('modalBody').innerHTML = `
        <p style="margin-bottom:20px">¿Eliminar el vehículo <strong>${patente}</strong>?</p>
        <div class="form-actions">
            <button class="btn btn-ghost" id="cancelDelV">Cancelar</button>
            <button class="btn btn-danger" id="confirmDelV">Sí, eliminar</button>
        </div>
    `;

    document.getElementById('cancelDelV').addEventListener('click', () => {
        document.getElementById('modalBody').innerHTML = originalBody;
        // Re-bind events
        loadVehiculos(clienteId, clienteNombre);
    });

    document.getElementById('confirmDelV').addEventListener('click', async () => {
        const { error } = await supabase.from('vehiculos').delete().eq('id', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Vehículo eliminado', 'success');
        loadVehiculos(clienteId, clienteNombre);
        loadClientes();
    });
}

function confirmDelete(id, nombre) {
    openModal('Confirmar eliminación', `
        <p style="margin-bottom:20px">¿Eliminar al cliente <strong>${nombre}</strong>?<br>
        <small style="color:var(--text-muted)">Se eliminarán también sus vehículos asociados.</small></p>
        <div class="form-actions">
            <button class="btn btn-ghost" id="cancelDel">Cancelar</button>
            <button class="btn btn-danger" id="confirmDel">Sí, eliminar</button>
        </div>
    `, '420px');

    document.getElementById('cancelDel').addEventListener('click', closeModal);
    document.getElementById('confirmDel').addEventListener('click', async () => {
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) { showToast('Error: ' + error.message, 'error'); return; }
        showToast('Cliente eliminado', 'success');
        closeModal();
        loadClientes();
    });
}
