import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Modal } from '../components/Modal'
import { Badge } from '../components/Badge'
import { Spinner, InlineSpinner } from '../components/Spinner'
import { fmtDateShort } from '../utils/helpers'
import { MARCAS, MARCAS_MODELOS } from '../data/marcas-modelos'

const inputCls = 'w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20'
const labelCls = 'block text-[11px] font-headline font-bold uppercase tracking-wider text-outline mb-1.5'

const COMBUSTIBLES = ['cualquiera','nafta','diesel','gnc','eléctrico','híbrido']
const TIPOS_HISTORIAL = ['servicio','reparacion','revision','diagnostico','otro']

function fmtDni(d) {
  const s = String(d || '').replace(/\D/g,'')
  if (s.length <= 2) return s
  if (s.length <= 5) return s.slice(0,2) + '.' + s.slice(2)
  return s.slice(0,2) + '.' + s.slice(2,5) + '.' + s.slice(5)
}

export function Clientes({ searchQuery, setTopbarAction }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [clientes, setClientes] = useState([])
  const [vcMap, setVcMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    setTopbarAction(
      <button onClick={() => setModal({ type: 'clienteForm', data: null })}
        className="bg-primary hover:bg-primary-dim text-on-primary-fixed px-3 md:px-5 py-2.5 rounded-xl font-headline font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 transition-all active:scale-95">
        <span className="material-symbols-outlined text-[18px]">add</span> <span className="hidden md:inline">Nuevo cliente</span>
      </button>
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('clientes').select('id,nombre,apellido,dni,telefono,email,created_at').eq('user_id', user?.id).order('apellido').order('nombre')
    if (searchQuery) q = q.or(`nombre.ilike.%${searchQuery}%,apellido.ilike.%${searchQuery}%,dni.ilike.%${searchQuery}%`)
    const [{ data }, { data: vc }] = await Promise.all([q, supabase.from('vehiculos').select('cliente_id').eq('user_id', user?.id)])
    setClientes(data || [])
    const map = {}
    ;(vc || []).forEach(v => { map[v.cliente_id] = (map[v.cliente_id] || 0) + 1 })
    setVcMap(map)
    setLoading(false)
  }, [user?.id, searchQuery])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-1">Clientes</h2>
          <p className="text-sm text-on-surface-variant">Gestión de clientes y vehículos</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>
              {['Nombre','DNI','Teléfono','Email','Vehículos','Portal','Registrado','Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-headline font-bold uppercase tracking-widest text-outline">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-12"><Spinner /></td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="flex flex-col items-center py-16 opacity-40">
                  <span className="material-symbols-outlined text-4xl text-outline mb-3">group</span>
                  <p className="text-sm font-bold text-on-surface uppercase tracking-tight">Sin clientes</p>
                </div>
              </td></tr>
            ) : clientes.map(c => (
              <tr key={c.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-sm font-bold text-on-surface">{[c.apellido, c.nombre].filter(Boolean).join(', ')}</td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">{c.dni ? fmtDni(c.dni) : '—'}</td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">{c.telefono || '—'}</td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">{c.email || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => setModal({ type: 'vehiculos', data: c })}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1 rounded-lg transition-colors border border-primary/20">
                    <span className="material-symbols-outlined text-[14px]">directions_car</span>
                    {vcMap[c.id] || 0} veh.
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">{fmtDateShort(c.created_at)}</td>
                <td className="px-4 py-3">
                  <PortalBtn clienteId={c.id} userId={user?.id} showToast={showToast} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ type: 'clienteForm', data: c })}
                      className="px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg">Editar</button>
                    <button onClick={() => setModal({ type: 'deleteCliente', data: c })}
                      className="px-2.5 py-1 text-xs font-bold text-error hover:bg-error/10 rounded-lg">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === 'clienteForm' && (
        <ClienteForm data={modal.data} onClose={() => setModal(null)} onSaved={load} showToast={showToast} user={user} />
      )}
      {modal?.type === 'vehiculos' && (
        <VehiculosModal cliente={modal.data} onClose={() => setModal(null)} showToast={showToast} user={user} onVehiculoChange={load} />
      )}
      {modal?.type === 'deleteCliente' && (
        <DeleteClienteModal data={modal.data} onClose={() => setModal(null)} onDeleted={load} showToast={showToast} />
      )}
    </div>
  )
}

// ---- Cliente Form ----
function ClienteForm({ data, onClose, onSaved, showToast, user }) {
  const [form, setForm] = useState({ nombre: data?.nombre || '', apellido: data?.apellido || '', dni: data?.dni || '', telefono: data?.telefono || '', email: data?.email || '', direccion: data?.direccion || '' })
  const [saving, setSaving] = useState(false)
  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { nombre: form.nombre.trim(), apellido: form.apellido.trim() || null, dni: form.dni.replace(/\D/g,'') || null, telefono: form.telefono.trim() || null, email: form.email.trim() || null, direccion: form.direccion.trim() || null, user_id: user?.id }
    const { error } = data?.id
      ? await supabase.from('clientes').update(payload).eq('id', data.id)
      : await supabase.from('clientes').insert(payload)
    if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
    showToast(data?.id ? 'Cliente actualizado' : 'Cliente creado', 'success')
    onSaved(); onClose()
  }

  return (
    <Modal title={data?.id ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Nombre *</label><input required type="text" value={form.nombre} onChange={f('nombre')} className={inputCls} placeholder="Juan" /></div>
          <div><label className={labelCls}>Apellido *</label><input required type="text" value={form.apellido} onChange={f('apellido')} className={inputCls} placeholder="García" /></div>
          <div><label className={labelCls}>DNI</label><input type="text" value={form.dni} onChange={f('dni')} className={inputCls} placeholder="12345678" maxLength={12} /></div>
          <div><label className={labelCls}>Teléfono</label><input type="tel" value={form.telefono} onChange={f('telefono')} className={inputCls} placeholder="+54 9 351 123-4567" /></div>
          <div><label className={labelCls}>Email</label><input type="email" value={form.email} onChange={f('email')} className={inputCls} placeholder="cliente@mail.com" /></div>
          <div><label className={labelCls}>Dirección</label><input type="text" value={form.direccion} onChange={f('direccion')} className={inputCls} placeholder="Av. Corrientes 1234" /></div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cancelar</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dim text-on-primary-fixed font-bold text-sm rounded-xl flex items-center gap-2 disabled:opacity-60">
            {saving && <InlineSpinner />} {data?.id ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ---- Vehiculos Modal ----
function VehiculosModal({ cliente, onClose, showToast, user, onVehiculoChange }) {
  const [view, setView] = useState('list') // list | form | historial | histForm
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // for edit/historial

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('vehiculos').select('*').eq('cliente_id', cliente.id).order('patente')
    setVehiculos(data || [])
    setLoading(false)
  }, [cliente.id])

  useEffect(() => { load() }, [load])

  const title = {
    list: `Vehículos — ${[cliente.apellido, cliente.nombre].filter(Boolean).join(', ')}`,
    form: selected ? 'Editar vehículo' : 'Nuevo vehículo',
    historial: `Historial — ${selected?.patente}`,
    histForm: 'Registro de historial',
  }[view]

  return (
    <Modal title={title} onClose={onClose} width="max-w-3xl">
      {view === 'list' && (
        <VehiculosList vehiculos={vehiculos} loading={loading} onNew={() => { setSelected(null); setView('form') }} onEdit={v => { setSelected(v); setView('form') }} onHistorial={v => { setSelected(v); setView('historial') }} onDelete={async (v) => {
          if (!confirm(`¿Eliminar ${v.patente}?`)) return
          const { error } = await supabase.from('vehiculos').delete().eq('id', v.id)
          if (error) { showToast('Error: ' + error.message, 'error'); return }
          showToast('Vehículo eliminado', 'success'); load(); onVehiculoChange()
        }} onClose={onClose} />
      )}
      {view === 'form' && (
        <VehiculoForm data={selected} clienteId={cliente.id} onBack={() => { setView('list'); setSelected(null) }} onSaved={() => { load(); onVehiculoChange() }} showToast={showToast} user={user} />
      )}
      {view === 'historial' && (
        <HistorialList vehiculo={selected} onBack={() => { setView('list') }} onNew={() => { setView('histForm') }} onEdit={h => { setSelected(prev => ({ ...prev, _histEdit: h })); setView('histForm') }} showToast={showToast} user={user} />
      )}
      {view === 'histForm' && (
        <HistorialForm vehiculo={selected} histId={selected?._histEdit?.id} onBack={() => { setView('historial'); setSelected(prev => ({ ...prev, _histEdit: null })) }} showToast={showToast} user={user} />
      )}
    </Modal>
  )
}

function VehiculosList({ vehiculos, loading, onNew, onEdit, onHistorial, onDelete, onClose }) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={onNew} className="bg-primary hover:bg-primary-dim text-on-primary-fixed px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">add</span> Nuevo vehículo
        </button>
      </div>
      {loading ? <Spinner /> : vehiculos.length === 0 ? (
        <div className="text-center py-12 opacity-40">
          <span className="material-symbols-outlined text-4xl text-outline block mb-2">directions_car</span>
          <p className="text-sm font-bold text-on-surface uppercase tracking-tight">Sin vehículos</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden mb-4">
          <table className="w-full">
            <thead className="bg-surface-container-low">
              <tr>{['Patente','Marca','Modelo','Año','Color','Acciones'].map(h => <th key={h} className="px-3 py-2.5 text-left text-[10px] font-headline font-bold uppercase tracking-wider text-outline">{h}</th>)}</tr>
            </thead>
            <tbody>
              {vehiculos.map(v => (
                <tr key={v.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-3 py-2.5 font-bold text-sm text-on-surface">{v.patente}</td>
                  <td className="px-3 py-2.5 text-sm text-on-surface-variant">{v.marca}</td>
                  <td className="px-3 py-2.5 text-sm text-on-surface-variant">{v.modelo}</td>
                  <td className="px-3 py-2.5 text-sm text-on-surface-variant">{v.anio || '—'}</td>
                  <td className="px-3 py-2.5 text-sm text-on-surface-variant">{v.color || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => onHistorial(v)} className="px-2 py-1 text-xs font-bold text-outline hover:text-on-surface hover:bg-white/5 rounded-lg">Historial</button>
                      <button onClick={() => onEdit(v)} className="px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg">Editar</button>
                      <button onClick={() => onDelete(v)} className="px-2 py-1 text-xs font-bold text-error hover:bg-error/10 rounded-lg">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end pt-2 border-t border-white/5">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cerrar</button>
      </div>
    </div>
  )
}

function VehiculoForm({ data, clienteId, onBack, onSaved, showToast, user }) {
  const [saving, setSaving] = useState(false)
  const [marca, setMarca] = useState(data?.marca || '')
  const [modelo, setModelo] = useState(data?.modelo || '')
  const [customMarca, setCustomMarca] = useState(data?.marca && !MARCAS.includes(data.marca) ? data.marca : '')
  const [customModelo, setCustomModelo] = useState(data?.modelo && !(MARCAS_MODELOS[data?.marca] || []).includes(data.modelo) ? data.modelo : '')
  const [form, setForm] = useState({ patente: data?.patente || '', anio: data?.anio || '', color: data?.color || '' })
  const f = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))

  const modelos = MARCAS_MODELOS[marca] || []
  const marcaIsOther = marca === '__otra__'
  const modeloIsOther = modelo === '__otro__'

  async function handleSubmit(e) {
    e.preventDefault()
    const finalMarca = marcaIsOther ? customMarca.trim() : marca
    const finalModelo = modeloIsOther ? customModelo.trim() : modelo
    if (!finalMarca) { showToast('Completá la marca', 'error'); return }
    if (!finalModelo) { showToast('Completá el modelo', 'error'); return }
    setSaving(true)
    const payload = { cliente_id: clienteId, patente: form.patente.trim().toUpperCase(), marca: finalMarca, modelo: finalModelo, anio: form.anio ? parseInt(form.anio) : null, color: form.color.trim() || null, user_id: user?.id }
    const { error } = data?.id
      ? await supabase.from('vehiculos').update(payload).eq('id', data.id)
      : await supabase.from('vehiculos').insert(payload)
    if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
    showToast(data?.id ? 'Vehículo actualizado' : 'Vehículo agregado', 'success')
    onSaved(); onBack()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Patente *</label>
          <input required type="text" value={form.patente} onChange={f('patente')} className={inputCls + ' uppercase'} placeholder="ABC123" />
        </div>
        <div>
          <label className={labelCls}>Marca *</label>
          <select value={marca} onChange={e => { setMarca(e.target.value); setModelo('') }} className={inputCls}>
            <option value="">— Seleccionar —</option>
            {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
            <option value="__otra__">Otra marca…</option>
          </select>
          {marcaIsOther && <input type="text" value={customMarca} onChange={e => setCustomMarca(e.target.value)} className={inputCls + ' mt-2'} placeholder="Escribí la marca" />}
        </div>
        <div>
          <label className={labelCls}>Modelo *</label>
          {marcaIsOther ? (
            <input type="text" value={customModelo} onChange={e => setCustomModelo(e.target.value)} className={inputCls} placeholder="Escribí el modelo" />
          ) : (
            <>
              <select value={modelo} onChange={e => setModelo(e.target.value)} disabled={!marca} className={inputCls}>
                <option value="">— Primero elegí la marca —</option>
                {modelos.map(m => <option key={m} value={m}>{m}</option>)}
                {modelos.length > 0 && <option value="__otro__">Otro modelo…</option>}
              </select>
              {modeloIsOther && <input type="text" value={customModelo} onChange={e => setCustomModelo(e.target.value)} className={inputCls + ' mt-2'} placeholder="Escribí el modelo" />}
            </>
          )}
        </div>
        <div>
          <label className={labelCls}>Año</label>
          <input type="number" value={form.anio} onChange={f('anio')} min={1900} max={new Date().getFullYear()+1} className={inputCls} placeholder={String(new Date().getFullYear())} />
        </div>
        <div>
          <label className={labelCls}>Color</label>
          <input type="text" value={form.color} onChange={f('color')} className={inputCls} placeholder="Rojo, azul, blanco…" />
        </div>
      </div>
      <div className="flex justify-between pt-4 border-t border-white/5">
        <button type="button" onClick={onBack} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver
        </button>
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dim text-on-primary-fixed font-bold text-sm rounded-xl flex items-center gap-2 disabled:opacity-60">
          {saving && <InlineSpinner />} {data?.id ? 'Guardar cambios' : 'Agregar vehículo'}
        </button>
      </div>
    </form>
  )
}

function HistorialList({ vehiculo, onBack, onNew, onEdit, showToast, user }) {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('historial_vehiculo').select('*').eq('vehiculo_id', vehiculo.id).order('fecha', { ascending: false })
    setHistorial(data || [])
    setLoading(false)
  }, [vehiculo.id])

  useEffect(() => { load() }, [load])

  async function del(id) {
    if (!confirm('¿Eliminar este registro?')) return
    const { error } = await supabase.from('historial_vehiculo').delete().eq('id', id)
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    showToast('Eliminado', 'success'); load()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-outline">{historial.length} registro{historial.length !== 1 ? 's' : ''}</p>
        <button onClick={onNew} className="bg-primary hover:bg-primary-dim text-on-primary-fixed px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">add</span> Agregar
        </button>
      </div>
      {loading ? <Spinner /> : historial.length === 0 ? (
        <div className="text-center py-12 opacity-40">
          <span className="material-symbols-outlined text-4xl text-outline block mb-2">history</span>
          <p className="text-sm font-bold text-on-surface uppercase tracking-tight">Sin registros</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden mb-4">
          <table className="w-full">
            <thead className="bg-surface-container-low">
              <tr>{['Fecha','Tipo','Descripción','Km','Costo','Acciones'].map(h => <th key={h} className="px-3 py-2.5 text-left text-[10px] font-headline font-bold uppercase tracking-wider text-outline">{h}</th>)}</tr>
            </thead>
            <tbody>
              {historial.map(h => (
                <tr key={h.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-3 py-2.5 text-sm text-on-surface whitespace-nowrap">{new Date(h.fecha+'T00:00:00').toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'})}</td>
                  <td className="px-3 py-2.5"><Badge estado={h.tipo} /></td>
                  <td className="px-3 py-2.5 text-sm text-on-surface max-w-[200px] truncate">{h.descripcion}</td>
                  <td className="px-3 py-2.5 text-sm text-on-surface-variant">{h.km ? h.km.toLocaleString('es-AR') + ' km' : '—'}</td>
                  <td className="px-3 py-2.5 text-sm text-right text-primary font-bold">{h.costo ? '$' + Number(h.costo).toLocaleString('es-AR',{minimumFractionDigits:2}) : '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => onEdit(h)} className="px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg">Editar</button>
                      <button onClick={() => del(h.id)} className="px-2 py-1 text-xs font-bold text-error hover:bg-error/10 rounded-lg">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex pt-2 border-t border-white/5">
        <button onClick={onBack} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver
        </button>
      </div>
    </div>
  )
}

function HistorialForm({ vehiculo, histId, onBack, showToast, user }) {
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ fecha: today, tipo: 'servicio', descripcion: '', km: '', costo: '0', notas: '' })
  const f = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))

  useEffect(() => {
    if (histId) {
      supabase.from('historial_vehiculo').select('*').eq('id', histId).single()
        .then(({ data }) => { if (data) setForm({ fecha: data.fecha, tipo: data.tipo, descripcion: data.descripcion, km: data.km || '', costo: data.costo || 0, notas: data.notas || '' }) })
    }
  }, [histId])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { vehiculo_id: vehiculo.id, fecha: form.fecha, tipo: form.tipo, descripcion: form.descripcion.trim(), km: form.km ? parseInt(form.km) : null, costo: parseFloat(form.costo) || 0, notas: form.notas.trim() || null, user_id: user?.id }
    const { error } = histId
      ? await supabase.from('historial_vehiculo').update(payload).eq('id', histId)
      : await supabase.from('historial_vehiculo').insert(payload)
    if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
    showToast(histId ? 'Registro actualizado' : 'Registro agregado', 'success')
    onBack()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div><label className={labelCls}>Fecha *</label><input required type="date" value={form.fecha} onChange={f('fecha')} className={inputCls} /></div>
        <div>
          <label className={labelCls}>Tipo *</label>
          <select required value={form.tipo} onChange={f('tipo')} className={inputCls}>
            {TIPOS_HISTORIAL.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Km actuales</label><input type="number" value={form.km} onChange={f('km')} min={0} className={inputCls} placeholder="85000" /></div>
        <div className="col-span-3"><label className={labelCls}>Descripción del trabajo *</label><textarea required rows={3} value={form.descripcion} onChange={f('descripcion')} className={inputCls} placeholder="Cambio de aceite y filtro, revisión frenos…" /></div>
        <div><label className={labelCls}>Costo ($)</label><input type="number" value={form.costo} onChange={f('costo')} min={0} step={0.01} className={inputCls} /></div>
        <div className="col-span-2"><label className={labelCls}>Notas adicionales</label><input type="text" value={form.notas} onChange={f('notas')} className={inputCls} placeholder="Observaciones opcionales" /></div>
      </div>
      <div className="flex justify-between pt-4 border-t border-white/5">
        <button type="button" onClick={onBack} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Volver
        </button>
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dim text-on-primary-fixed font-bold text-sm rounded-xl flex items-center gap-2 disabled:opacity-60">
          {saving && <InlineSpinner />} {histId ? 'Guardar cambios' : 'Agregar registro'}
        </button>
      </div>
    </form>
  )
}

// ---- Portal Button ----
function PortalBtn({ clienteId, userId, showToast }) {
  const [loading, setLoading] = useState(false)

  async function copiarLink() {
    setLoading(true)
    // Buscar token existente
    let { data: existing } = await supabase
      .from('portal_tokens')
      .select('token')
      .eq('cliente_id', clienteId)
      .single()

    let token = existing?.token
    if (!token) {
      // Crear nuevo token
      const { data: created, error } = await supabase
        .from('portal_tokens')
        .insert({ cliente_id: clienteId, user_id: userId })
        .select('token')
        .single()
      if (error) { showToast('Error generando link', 'error'); setLoading(false); return }
      token = created.token
    }

    const url = `${window.location.origin}?portal=${token}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('Link del portal copiado ✓', 'success')
    } catch {
      showToast(url, 'success')
    }
    setLoading(false)
  }

  return (
    <button
      onClick={copiarLink}
      disabled={loading}
      title="Copiar link del portal del cliente"
      className="flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-primary/10 px-2.5 py-1 rounded-lg transition-colors border border-primary/20 disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-[13px]">link</span>
      {loading ? '…' : 'Portal'}
    </button>
  )
}

function DeleteClienteModal({ data, onClose, onDeleted, showToast }) {
  const [checking, setChecking] = useState(true)
  const [turnos, setTurnos] = useState([])
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.from('turnos').select('fecha_hora').eq('cliente_id', data.id).order('fecha_hora')
      .then(({ data: t }) => { setTurnos(t || []); setChecking(false) })
  }, [data.id])

  async function confirm() {
    setDeleting(true)
    const { error } = await supabase.from('clientes').delete().eq('id', data.id)
    if (error) { showToast('Error: ' + error.message, 'error'); setDeleting(false); return }
    showToast('Cliente eliminado', 'success'); onDeleted(); onClose()
  }

  const nombre = [data.apellido, data.nombre].filter(Boolean).join(', ')
  return (
    <Modal title={turnos.length > 0 ? 'No se puede eliminar' : 'Confirmar eliminación'} onClose={onClose} width="max-w-sm">
      {checking ? <Spinner /> : turnos.length > 0 ? (
        <div>
          <div className="flex gap-3 items-start mb-6">
            <span className="material-symbols-outlined text-yellow-400 text-xl mt-0.5">warning</span>
            <p className="text-sm text-on-surface">No se puede eliminar a <strong>{nombre}</strong> ya que tiene turnos asignados.</p>
          </div>
          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold bg-primary text-on-primary-fixed rounded-xl">Entendido</button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-on-surface mb-2">¿Eliminar al cliente <strong>{nombre}</strong>?</p>
          <p className="text-xs text-outline mb-6">Se eliminarán también sus vehículos asociados.</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cancelar</button>
            <button onClick={confirm} disabled={deleting} className="px-4 py-2 text-sm font-bold bg-error/20 text-error border border-error/30 hover:bg-error/30 rounded-xl flex items-center gap-2">
              {deleting && <InlineSpinner />} Sí, eliminar
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
