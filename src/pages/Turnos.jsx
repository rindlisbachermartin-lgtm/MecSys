import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Modal } from '../components/Modal'
import { Badge } from '../components/Badge'
import { Spinner, InlineSpinner } from '../components/Spinner'
import { fmtDate, fmtMoney, toLocalDatetime, formatWAPhone } from '../utils/helpers'

const ESTADOS = ['pendiente', 'en_proceso', 'finalizado', 'cancelado']
const inputCls = 'w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20'
const labelCls = 'block text-[11px] font-headline font-bold uppercase tracking-wider text-outline mb-1.5'

export function Turnos({ searchQuery, setTopbarAction }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [modal, setModal] = useState(null) // {type:'view'|'form'|'delete'|'wa', data}

  useEffect(() => {
    setTopbarAction(
      <button onClick={() => setModal({ type: 'form', data: null })}
        className="bg-primary hover:bg-primary-dim text-on-primary-fixed px-3 md:px-5 py-2.5 rounded-xl font-headline font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 transition-all active:scale-95">
        <span className="material-symbols-outlined text-[18px]">add</span> <span className="hidden md:inline">Nuevo turno</span>
      </button>
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('turnos')
      .select('id,fecha_hora,estado,tareas,clientes(id,nombre,apellido,telefono),vehiculos(id,patente,marca,modelo)')
      .eq('user_id', user?.id).order('fecha_hora', { ascending: false })
    if (filtroEstado) q = q.eq('estado', filtroEstado)
    let { data } = await q
    data = data || []
    if (searchQuery) {
      const s = searchQuery.toLowerCase()
      data = data.filter(t =>
        [t.clientes?.apellido, t.clientes?.nombre].filter(Boolean).join(' ').toLowerCase().includes(s) ||
        t.vehiculos?.patente?.toLowerCase().includes(s)
      )
    }
    if (desde) data = data.filter(t => t.fecha_hora.slice(0,10) >= desde)
    if (hasta) data = data.filter(t => t.fecha_hora.slice(0,10) <= hasta)
    setTurnos(data)
    setLoading(false)
  }, [user?.id, filtroEstado, desde, hasta, searchQuery])

  useEffect(() => { load() }, [load])

  async function changeEstado(id, estado) {
    const { error } = await supabase.from('turnos').update({ estado }).eq('id', id)
    if (error) { showToast('Error al cambiar estado', 'error'); return }
    showToast('Estado actualizado', 'success')
    setTurnos(prev => prev.map(t => t.id === id ? { ...t, estado } : t))
    if (estado === 'finalizado') {
      const t = turnos.find(x => x.id === id)
      if (t?.clientes?.telefono) setModal({ type: 'wa', data: t })
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-1">Turnos</h2>
          <p className="text-sm text-on-surface-variant">Gestión de turnos del taller</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_',' ')}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-outline">
          <span>Desde</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>
              {['Fecha/Hora','Cliente','Vehículo','Tareas','Estado','Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-headline font-bold uppercase tracking-widest text-outline">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12"><Spinner /></td></tr>
            ) : turnos.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center py-16 opacity-40">
                  <span className="material-symbols-outlined text-4xl text-outline mb-3">calendar_month</span>
                  <p className="text-sm font-bold text-on-surface uppercase tracking-tight">Sin turnos</p>
                </div>
              </td></tr>
            ) : turnos.map(t => (
              <tr key={t.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-sm text-on-surface whitespace-nowrap">{fmtDate(t.fecha_hora)}</td>
                <td className="px-4 py-3 text-sm text-on-surface">{[t.clientes?.apellido, t.clientes?.nombre].filter(Boolean).join(', ') || '—'}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-bold text-on-surface">{t.vehiculos?.patente || '—'}</p>
                  <p className="text-xs text-outline">{t.vehiculos?.marca} {t.vehiculos?.modelo}</p>
                </td>
                <td className="px-4 py-3 text-sm text-on-surface-variant max-w-[180px] truncate">{t.tareas || '—'}</td>
                <td className="px-4 py-3">
                  <select value={t.estado} onChange={e => changeEstado(t.id, e.target.value)}
                    className="bg-surface-container border border-outline-variant/30 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_',' ')}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal({ type: 'view', data: t })}
                      className="px-2.5 py-1 text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-white/5 rounded-lg transition-colors">Ver</button>
                    <button onClick={() => setModal({ type: 'form', data: t })}
                      className="px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors">Editar</button>
                    <button onClick={() => setModal({ type: 'delete', data: t })}
                      className="px-2.5 py-1 text-xs font-bold text-error hover:bg-error/10 rounded-lg transition-colors">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {modal?.type === 'view' && (
        <ViewTurno id={modal.data.id} onClose={() => setModal(null)} onEdit={id => setModal({ type: 'form', data: { id } })} />
      )}
      {modal?.type === 'form' && (
        <FormTurno id={modal.data?.id || null} onClose={() => setModal(null)} onSaved={load} showToast={showToast} user={user} />
      )}
      {modal?.type === 'delete' && (
        <DeleteConfirm data={modal.data} onClose={() => setModal(null)} onDeleted={load} showToast={showToast} />
      )}
      {modal?.type === 'wa' && (
        <WAModal turno={modal.data} onClose={() => setModal(null)} showToast={showToast} />
      )}
    </div>
  )
}

// ---- View Modal ----
function ViewTurno({ id, onClose, onEdit }) {
  const [data, setData] = useState(null)
  const [reps, setReps] = useState([])
  useEffect(() => {
    Promise.all([
      supabase.from('turnos').select('*,clientes(*),vehiculos(*)').eq('id', id).single(),
      supabase.from('turno_repuestos').select('cantidad,precio_unitario,repuestos(nombre,codigo)').eq('turno_id', id)
    ]).then(([{ data: t }, { data: r }]) => { setData(t); setReps(r || []) })
  }, [id])

  if (!data) return <Modal title="Detalle del turno" onClose={onClose}><Spinner /></Modal>

  const total = reps.reduce((s, r) => s + r.cantidad * r.precio_unitario, 0)
  const row = (label, val) => (
    <div>
      <p className={labelCls}>{label}</p>
      <p className="text-sm text-on-surface font-medium">{val || '—'}</p>
    </div>
  )

  return (
    <Modal title="Detalle del turno" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {row('Cliente', [data.clientes?.apellido, data.clientes?.nombre].filter(Boolean).join(', '))}
        {row('Teléfono', data.clientes?.telefono)}
        {row('Vehículo', `${data.vehiculos?.patente} — ${data.vehiculos?.marca} ${data.vehiculos?.modelo} ${data.vehiculos?.anio || ''}`)}
        {row('Fecha', fmtDate(data.fecha_hora))}
        <div>
          <p className={labelCls}>Estado</p>
          <Badge estado={data.estado} />
        </div>
      </div>
      {data.tareas && (
        <div className="mb-4">
          <p className={labelCls}>Tareas</p>
          <div className="bg-surface-container-low border border-white/5 rounded-xl p-3 text-sm text-on-surface">{data.tareas}</div>
        </div>
      )}
      {data.notas && (
        <div className="mb-4">
          <p className={labelCls}>Notas</p>
          <div className="bg-surface-container-low border border-white/5 rounded-xl p-3 text-sm text-on-surface">{data.notas}</div>
        </div>
      )}
      {reps.length > 0 && (
        <div className="mb-4">
          <p className={labelCls}>Repuestos</p>
          <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-surface-container-low">
                <th className="px-3 py-2 text-left text-[10px] font-headline font-bold uppercase tracking-wider text-outline">Repuesto</th>
                <th className="px-3 py-2 text-right text-[10px] font-headline font-bold uppercase tracking-wider text-outline">Cant.</th>
                <th className="px-3 py-2 text-right text-[10px] font-headline font-bold uppercase tracking-wider text-outline">Precio</th>
                <th className="px-3 py-2 text-right text-[10px] font-headline font-bold uppercase tracking-wider text-outline">Subtotal</th>
              </tr></thead>
              <tbody>
                {reps.map((r, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-3 py-2 text-on-surface">{r.repuestos?.nombre || '—'}</td>
                    <td className="px-3 py-2 text-right text-on-surface-variant">{r.cantidad}</td>
                    <td className="px-3 py-2 text-right text-on-surface-variant">{fmtMoney(r.precio_unitario)}</td>
                    <td className="px-3 py-2 text-right font-bold text-primary">{fmtMoney(r.cantidad * r.precio_unitario)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-right text-sm font-bold text-primary mt-2">Total repuestos: {fmtMoney(total)}</p>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cerrar</button>
        <button onClick={() => { onClose(); onEdit(id) }} className="px-4 py-2 text-sm font-bold bg-primary text-on-primary-fixed rounded-xl hover:bg-primary-dim">Editar</button>
      </div>
    </Modal>
  )
}

// ---- Form Modal ----
function FormTurno({ id, onClose, onSaved, showToast, user }) {
  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState([])
  const [repuestosDB, setRepuestosDB] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [vehiculoActual, setVehiculoActual] = useState(null)
  const [items, setItems] = useState([])
  const [horariosOcupados, setHorariosOcupados] = useState([])

  const [form, setForm] = useState({
    cliente_id: '', vehiculo_id: '', fecha_hora: '', estado: 'pendiente', tareas: '', notas: ''
  })

  useEffect(() => {
    async function init() {
      const [{ data: cls }, { data: reps }] = await Promise.all([
        supabase.from('clientes').select('id,nombre,apellido').order('apellido').order('nombre'),
        supabase.from('repuestos').select('id,nombre,codigo,precio_unitario,marca_compatible,modelo_compatible,anio_desde,anio_hasta').order('nombre')
      ])
      setClientes(cls || [])
      setRepuestosDB(reps || [])

      if (id) {
        const [{ data: t }, { data: tr }] = await Promise.all([
          supabase.from('turnos').select('*').eq('id', id).single(),
          supabase.from('turno_repuestos').select('*').eq('turno_id', id)
        ])
        if (t) {
          setForm({ cliente_id: t.cliente_id || '', vehiculo_id: t.vehiculo_id || '', fecha_hora: toLocalDatetime(new Date(t.fecha_hora)), estado: t.estado, tareas: t.tareas || '', notas: t.notas || '' })
          setItems((tr || []).map(r => ({ repuesto_id: r.repuesto_id, cantidad: r.cantidad, precio_unitario: r.precio_unitario })))
          if (t.cliente_id) {
            const { data: vvs } = await supabase.from('vehiculos').select('id,patente,marca,modelo,anio').eq('cliente_id', t.cliente_id)
            setVehiculos(vvs || [])
            setVehiculoActual((vvs || []).find(v => v.id === t.vehiculo_id) || null)
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [id])

  async function loadVehiculos(clienteId) {
    const { data: vvs } = await supabase.from('vehiculos').select('id,patente,marca,modelo,anio').eq('cliente_id', clienteId)
    setVehiculos(vvs || [])
    setVehiculoActual(vvs?.[0] || null)
    setForm(f => ({ ...f, vehiculo_id: vvs?.[0]?.id || '' }))
  }

  async function checkHorarios(fechaHoraStr) {
    if (!fechaHoraStr) return
    const d = new Date(fechaHoraStr)
    const dayStart = new Date(d); dayStart.setHours(0,0,0,0)
    const dayEnd = new Date(d); dayEnd.setHours(23,59,59,999)
    const { data } = await supabase.from('turnos').select('fecha_hora,clientes(nombre,apellido)')
      .gte('fecha_hora', dayStart.toISOString()).lte('fecha_hora', dayEnd.toISOString()).neq('estado','cancelado')
    setHorariosOcupados((data || []).filter(t => !id || t.id !== id))
  }

  const compatibles = repuestosDB.filter(r => {
    if (!vehiculoActual) return true
    const esUniversal = !r.marca_compatible && !r.modelo_compatible
    if (esUniversal) return true
    const marcaOk = !r.marca_compatible || r.marca_compatible.toLowerCase() === (vehiculoActual.marca || '').toLowerCase()
    const modeloOk = !r.modelo_compatible || r.modelo_compatible.toLowerCase() === (vehiculoActual.modelo || '').toLowerCase()
    const anioOk = (!r.anio_desde || !vehiculoActual.anio || vehiculoActual.anio >= r.anio_desde) && (!r.anio_hasta || !vehiculoActual.anio || vehiculoActual.anio <= r.anio_hasta)
    return marcaOk && modeloOk && anioOk
  })

  function addItem() {
    const first = compatibles[0]
    setItems(prev => [...prev, { repuesto_id: first?.id || '', cantidad: 1, precio_unitario: first?.precio_unitario || 0 }])
  }

  function updateItem(i, field, val) {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      const updated = { ...item, [field]: val }
      if (field === 'repuesto_id') {
        const rep = repuestosDB.find(r => r.id === val)
        updated.precio_unitario = rep?.precio_unitario || 0
      }
      return updated
    }))
  }

  function removeItem(i) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, fecha_hora: new Date(form.fecha_hora).toISOString(), user_id: user?.id }
    let turnoId = id
    if (id) {
      const { error } = await supabase.from('turnos').update(payload).eq('id', id)
      if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('turnos').insert(payload).select().single()
      if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
      turnoId = data.id
    }
    await supabase.from('turno_repuestos').delete().eq('turno_id', turnoId)
    const rows = items.filter(i => i.repuesto_id).map(i => ({ turno_id: turnoId, repuesto_id: i.repuesto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario }))
    if (rows.length) await supabase.from('turno_repuestos').insert(rows)
    showToast(id ? 'Turno actualizado' : 'Turno creado', 'success')
    onSaved()
    onClose()
  }

  if (loading) return <Modal title={id ? 'Editar turno' : 'Nuevo turno'} onClose={onClose}><Spinner /></Modal>

  return (
    <Modal title={id ? 'Editar turno' : 'Nuevo turno'} onClose={onClose} width="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Cliente *</label>
            <select required value={form.cliente_id} onChange={e => { setForm(f => ({ ...f, cliente_id: e.target.value, vehiculo_id: '' })); if (e.target.value) loadVehiculos(e.target.value) }} className={inputCls}>
              <option value="">— Seleccionar —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{[c.apellido, c.nombre].filter(Boolean).join(', ')}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Vehículo *</label>
            <select required value={form.vehiculo_id} onChange={e => { setForm(f => ({ ...f, vehiculo_id: e.target.value })); setVehiculoActual(vehiculos.find(v => v.id === e.target.value) || null) }} className={inputCls}>
              <option value="">— Seleccionar cliente primero —</option>
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} — {v.marca} {v.modelo}{v.anio ? ` (${v.anio})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Fecha y hora *</label>
            <input type="datetime-local" required value={form.fecha_hora} onChange={e => { setForm(f => ({ ...f, fecha_hora: e.target.value })); checkHorarios(e.target.value) }} className={inputCls} />
            {horariosOcupados.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-[10px] font-bold text-yellow-400 uppercase mb-1">Turnos ya agendados ese día:</p>
                <div className="flex flex-wrap gap-1">
                  {horariosOcupados.map((t, i) => (
                    <span key={i} className="text-[10px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">
                      {new Date(t.fecha_hora).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})} {t.clientes?.apellido || ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} className={inputCls}>
              {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Tareas a realizar</label>
            <textarea rows={3} value={form.tareas} onChange={e => setForm(f => ({ ...f, tareas: e.target.value }))} className={inputCls} placeholder="Descripción de las tareas…" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Notas internas</label>
            <textarea rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className={inputCls} placeholder="Notas para uso interno…" />
          </div>
        </div>

        {/* Repuestos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={labelCls + ' mb-0'}>Repuestos utilizados</p>
              <p className="text-[10px] text-outline mt-0.5">
                {vehiculoActual ? `${compatibles.length} de ${repuestosDB.length} compatibles con ${vehiculoActual.marca} ${vehiculoActual.modelo}` : 'Seleccioná un vehículo para filtrar repuestos'}
              </p>
            </div>
            <button type="button" onClick={addItem} className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 transition-colors">+ Agregar</button>
          </div>
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_80px_120px_40px_28px] gap-2 text-[10px] font-headline font-bold uppercase tracking-wider text-outline px-1">
                <span>Repuesto</span><span>Cant.</span><span>Precio u.</span><span>Subtotal</span><span></span>
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_120px_40px_28px] gap-2 items-center">
                  <select value={item.repuesto_id} onChange={e => updateItem(i, 'repuesto_id', e.target.value)} className={inputCls + ' text-xs'}>
                    {compatibles.map(r => <option key={r.id} value={r.id}>{r.nombre}{r.codigo ? ` [${r.codigo}]` : ''}</option>)}
                  </select>
                  <input type="number" min="0.001" step="0.001" value={item.cantidad} onChange={e => updateItem(i, 'cantidad', parseFloat(e.target.value) || 0)} className={inputCls + ' text-xs'} />
                  <input type="number" min="0" step="0.01" value={item.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', parseFloat(e.target.value) || 0)} className={inputCls + ' text-xs'} />
                  <span className="text-xs font-bold text-primary text-right">{fmtMoney(item.cantidad * item.precio_unitario)}</span>
                  <button type="button" onClick={() => removeItem(i)} className="w-7 h-7 flex items-center justify-center text-error hover:bg-error/10 rounded-lg">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ))}
              <div className="text-right text-sm font-bold text-primary pt-2 border-t border-white/5">
                Total: {fmtMoney(items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cancelar</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dim text-on-primary-fixed font-bold text-sm rounded-xl flex items-center gap-2 disabled:opacity-60">
            {saving && <InlineSpinner />}
            {id ? 'Guardar cambios' : 'Crear turno'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ---- Delete Confirm ----
function DeleteConfirm({ data, onClose, onDeleted, showToast }) {
  const [loading, setLoading] = useState(false)
  async function confirm() {
    setLoading(true)
    const { error } = await supabase.from('turnos').delete().eq('id', data.id)
    if (error) { showToast('Error: ' + error.message, 'error'); setLoading(false); return }
    showToast('Turno eliminado', 'success')
    onDeleted()
    onClose()
  }
  return (
    <Modal title="Confirmar eliminación" onClose={onClose} width="max-w-sm">
      <p className="text-sm text-on-surface mb-6">¿Eliminar este turno? Esta acción no se puede deshacer.</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cancelar</button>
        <button onClick={confirm} disabled={loading} className="px-4 py-2 text-sm font-bold bg-error/20 text-error border border-error/30 hover:bg-error/30 rounded-xl flex items-center gap-2">
          {loading && <InlineSpinner />} Sí, eliminar
        </button>
      </div>
    </Modal>
  )
}

// ---- WhatsApp Modal ----
function WAModal({ turno, onClose, showToast }) {
  const nombre = [turno.clientes?.apellido, turno.clientes?.nombre].filter(Boolean).join(', ')
  const patente = turno.vehiculos?.patente || ''
  const vehiculo = `${turno.vehiculos?.marca || ''} ${turno.vehiculos?.modelo || ''}`.trim()
  const [msg, setMsg] = useState(`Hola ${nombre}! Le informamos que su vehículo *${patente}*${vehiculo ? ` (${vehiculo})` : ''} ya está listo para retirar del taller. Cualquier consulta estamos a su disposición. Muchas gracias!`)
  const [loading, setLoading] = useState(false)

  async function send() {
    setLoading(true)
    const phone = formatWAPhone(turno.clientes.telefono)
    const { data, error } = await supabase.functions.invoke('send-whatsapp', { body: { to: phone, message: msg } })
    setLoading(false)
    if (error || data?.success === false) { showToast('Error al enviar WhatsApp', 'error'); return }
    showToast(`WhatsApp enviado a ${nombre}`, 'success')
    onClose()
  }

  return (
    <Modal title="Notificar por WhatsApp" onClose={onClose} width="max-w-md">
      <div className="flex items-center gap-3 bg-surface-container-low border border-white/5 rounded-xl p-3 mb-4">
        <span className="material-symbols-outlined text-primary">smartphone</span>
        <div>
          <p className="font-bold text-sm text-on-surface">{nombre}</p>
          <p className="text-xs text-outline">{turno.clientes?.telefono}</p>
        </div>
      </div>
      <div className="mb-4">
        <label className={labelCls}>Mensaje</label>
        <textarea rows={5} value={msg} onChange={e => setMsg(e.target.value)} className={inputCls} />
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Ahora no</button>
        <button onClick={send} disabled={loading} className="px-4 py-2 text-sm font-bold bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 rounded-xl flex items-center gap-2">
          {loading && <InlineSpinner />}
          <span className="material-symbols-outlined text-[16px]">send</span> Enviar
        </button>
      </div>
    </Modal>
  )
}
