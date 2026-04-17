import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Modal } from '../components/Modal'
import { Badge } from '../components/Badge'
import { Spinner, InlineSpinner } from '../components/Spinner'
import { fmtMoney, fmtDateShort } from '../utils/helpers'
import { imprimirDocumento } from '../utils/documento'

const ESTADOS = ['borrador', 'aprobado', 'rechazado']
const inputCls = 'w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20'
const labelCls = 'block text-[11px] font-headline font-bold uppercase tracking-wider text-outline mb-1.5'

const ESTADO_STYLES = {
  borrador:  { badge: 'bg-outline/15 text-outline border-outline/30',           select: 'border-outline/40 text-outline' },
  aprobado:  { badge: 'bg-green-500/15 text-green-400 border-green-500/30',      select: 'border-green-500/40 text-green-400' },
  rechazado: { badge: 'bg-red-500/15 text-red-400 border-red-500/30',            select: 'border-red-500/40 text-red-400' },
}

function EstadoEditor({ id, estado, estados, onConfirm }) {
  const [sel, setSel] = useState(estado)
  const [saving, setSaving] = useState(false)
  const changed = sel !== estado
  const style = ESTADO_STYLES[sel] || ESTADO_STYLES.borrador

  async function confirmar() {
    setSaving(true)
    await onConfirm(id, sel)
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={sel}
        onChange={e => setSel(e.target.value)}
        className={`border rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wider bg-transparent focus:outline-none focus:ring-1 transition-colors cursor-pointer ${
          changed ? 'border-primary/50 text-primary' : style.select
        }`}
      >
        {estados.map(e => <option key={e} value={e} style={{ color: '#e2e8f0', background: '#1e1e2e' }}>{e}</option>)}
      </select>
      {changed && (
        <button
          onClick={confirmar}
          disabled={saving}
          title="Confirmar cambio"
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-green-500/20 hover:bg-green-500/35 text-green-400 border border-green-500/30 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving
            ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
            : <span className="material-symbols-outlined text-[15px]">check</span>
          }
        </button>
      )}
    </div>
  )
}

export function Presupuestos({ searchQuery, setTopbarAction }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [modal, setModal] = useState(null)

  useEffect(() => {
    setTopbarAction(
      <button onClick={() => setModal({ type: 'form', data: null })}
        className="bg-primary hover:bg-primary-dim text-on-primary-fixed px-3 md:px-5 py-2.5 rounded-xl font-headline font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 transition-all active:scale-95">
        <span className="material-symbols-outlined text-[18px]">add</span> <span className="hidden md:inline">Nuevo presupuesto</span>
      </button>
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('v_presupuestos_totales').select('*').eq('user_id', user?.id).order('created_at', { ascending: false })
    let all = data || []
    if (filtroEstado) all = all.filter(p => p.estado === filtroEstado)
    if (searchQuery) { const s = searchQuery.toLowerCase(); all = all.filter(p => p.cliente_nombre?.toLowerCase().includes(s) || p.patente?.toLowerCase().includes(s)) }
    if (desde) all = all.filter(p => p.created_at.slice(0,10) >= desde)
    if (hasta) all = all.filter(p => p.created_at.slice(0,10) <= hasta)
    setLista(all)
    setLoading(false)
  }, [user?.id, filtroEstado, desde, hasta, searchQuery])

  useEffect(() => { load() }, [load])

  async function changeEstado(id, estado) {
    const { error } = await supabase.from('presupuestos').update({ estado }).eq('id', id)
    if (error) { showToast('Error al cambiar estado', 'error'); return }
    showToast('Estado actualizado', 'success')
    setLista(prev => prev.map(p => p.id === id ? { ...p, estado } : p))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-1">Presupuestos</h2>
          <p className="text-sm text-on-surface-variant">Gestión de presupuestos del taller</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20">
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-outline">
          <span>Desde</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <span>Hasta</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>{['Fecha','Cliente','Vehículo','Repuestos','Mano de obra','Total','Estado','Acciones'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-headline font-bold uppercase tracking-widest text-outline">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-12"><Spinner /></td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="flex flex-col items-center py-16 opacity-40">
                  <span className="material-symbols-outlined text-4xl text-outline mb-3">request_quote</span>
                  <p className="text-sm font-bold text-on-surface uppercase tracking-tight">Sin presupuestos</p>
                </div>
              </td></tr>
            ) : lista.map(p => (
              <tr key={p.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-sm text-on-surface whitespace-nowrap">{fmtDateShort(p.created_at)}</td>
                <td className="px-4 py-3 text-sm text-on-surface">{p.cliente_nombre || '—'}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-bold text-on-surface">{p.patente || '—'}</p>
                  <p className="text-xs text-outline">{p.vehiculo}</p>
                </td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">{fmtMoney(p.total_repuestos)}</td>
                <td className="px-4 py-3 text-sm text-on-surface-variant">{fmtMoney(p.mano_de_obra)}</td>
                <td className="px-4 py-3 text-sm font-bold text-primary">{fmtMoney(p.total_general)}</td>
                <td className="px-4 py-3">
                  <EstadoEditor id={p.id} estado={p.estado} estados={ESTADOS} onConfirm={changeEstado} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ type: 'view', data: p })} className="px-2.5 py-1 text-xs font-bold text-on-surface-variant hover:bg-white/5 rounded-lg">Ver</button>
                    <button onClick={() => setModal({ type: 'form', data: p })} className="px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg">Editar</button>
                    <button onClick={() => setModal({ type: 'delete', data: p })} className="px-2.5 py-1 text-xs font-bold text-error hover:bg-error/10 rounded-lg">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === 'view' && <ViewPresupuesto id={modal.data.id} onClose={() => setModal(null)} onEdit={id => setModal({ type: 'form', data: { id } })} />}
      {modal?.type === 'form' && <FormPresupuesto id={modal.data?.id || null} onClose={() => setModal(null)} onSaved={load} showToast={showToast} user={user} />}
      {modal?.type === 'delete' && <DeleteConfirm table="presupuestos" data={modal.data} onClose={() => setModal(null)} onDeleted={load} showToast={showToast} />}
    </div>
  )
}

// ---- View ----
function ViewPresupuesto({ id, onClose, onEdit }) {
  const [p, setP] = useState(null)
  const [items, setItems] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.from('presupuestos').select('*,clientes(*),vehiculos(*)').eq('id', id).single(),
      supabase.from('presupuesto_items').select('*,repuestos(nombre,codigo)').eq('presupuesto_id', id)
    ]).then(([{ data: pr }, { data: it }]) => { setP(pr); setItems(it || []) })
  }, [id])

  if (!p) return <Modal title="Presupuesto" onClose={onClose}><Spinner /></Modal>

  const totalRep = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const subtotal = totalRep + (p.mano_de_obra || 0)
  const total = p.incluye_iva ? subtotal * 1.21 : subtotal

  return (
    <Modal title="Detalle del presupuesto" onClose={onClose} width="max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div><p className={labelCls}>Cliente</p><p className="text-sm font-bold text-on-surface">{[p.clientes?.apellido, p.clientes?.nombre].filter(Boolean).join(', ') || '—'}</p></div>
        <div><p className={labelCls}>Vehículo</p><p className="text-sm text-on-surface">{p.vehiculos?.patente} — {p.vehiculos?.marca} {p.vehiculos?.modelo} {p.vehiculos?.anio || ''}</p></div>
        <div><p className={labelCls}>Estado</p><Badge estado={p.estado} /></div>
        <div><p className={labelCls}>IVA</p><p className="text-sm text-on-surface">{p.incluye_iva ? 'Incluye 21% IVA' : 'Sin IVA'}</p></div>
        {p.notas && <div className="col-span-2"><p className={labelCls}>Notas</p><p className="text-sm text-on-surface bg-surface-container-low rounded-xl p-3">{p.notas}</p></div>}
      </div>

      <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead><tr className="bg-surface-container-low">
            {['Descripción','Cant.','Precio u.','Subtotal'].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-headline font-bold uppercase tracking-wider text-outline">{h}</th>)}
          </tr></thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-t border-white/5">
                <td className="px-3 py-2 text-on-surface">{item.descripcion || item.repuestos?.nombre || '—'}</td>
                <td className="px-3 py-2 text-on-surface-variant">{item.cantidad}</td>
                <td className="px-3 py-2 text-on-surface-variant">{fmtMoney(item.precio_unitario)}</td>
                <td className="px-3 py-2 font-bold text-primary">{fmtMoney(item.cantidad * item.precio_unitario)}</td>
              </tr>
            ))}
            <tr className="border-t border-white/10">
              <td colSpan={3} className="px-3 py-2 text-sm text-right text-on-surface-variant">Mano de obra</td>
              <td className="px-3 py-2 font-bold text-on-surface">{fmtMoney(p.mano_de_obra)}</td>
            </tr>
            {p.incluye_iva && <tr><td colSpan={3} className="px-3 py-2 text-sm text-right text-on-surface-variant">IVA 21%</td><td className="px-3 py-2 font-bold text-on-surface">{fmtMoney(subtotal * 0.21)}</td></tr>}
            <tr className="bg-primary/5 border-t border-primary/20">
              <td colSpan={3} className="px-3 py-3 text-sm font-black text-right text-on-surface uppercase tracking-wider">Total</td>
              <td className="px-3 py-3 text-lg font-black text-primary">{fmtMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <button onClick={() => imprimirDocumento(p, items, 'presupuesto')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl border border-white/5">
          <span className="material-symbols-outlined text-[18px]">print</span> Imprimir
        </button>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cerrar</button>
          <button onClick={() => { onClose(); onEdit(id) }} className="px-4 py-2 text-sm font-bold bg-primary text-on-primary-fixed rounded-xl">Editar</button>
        </div>
      </div>
    </Modal>
  )
}

// ---- Form ----
function FormPresupuesto({ id, onClose, onSaved, showToast, user }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [repuestosDB, setRepuestosDB] = useState([])
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ cliente_id: '', vehiculo_id: '', estado: 'borrador', mano_de_obra: 0, incluye_iva: false, validez_dias: 30, notas: '' })
  const f = k => e => setForm(prev => ({ ...prev, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  useEffect(() => {
    async function init() {
      const [{ data: cls }, { data: reps }] = await Promise.all([
        supabase.from('clientes').select('id,nombre,apellido').order('apellido').order('nombre'),
        supabase.from('repuestos').select('id,nombre,codigo,precio_unitario').order('nombre')
      ])
      setClientes(cls || [])
      setRepuestosDB(reps || [])
      if (id) {
        const [{ data: p }, { data: it }] = await Promise.all([
          supabase.from('presupuestos').select('*').eq('id', id).single(),
          supabase.from('presupuesto_items').select('*,repuestos(nombre,codigo)').eq('presupuesto_id', id)
        ])
        if (p) {
          setForm({ cliente_id: p.cliente_id || '', vehiculo_id: p.vehiculo_id || '', estado: p.estado, mano_de_obra: p.mano_de_obra || 0, incluye_iva: p.incluye_iva || false, validez_dias: p.validez_dias || 30, notas: p.notas || '' })
          setItems((it || []).map(i => ({ repuesto_id: i.repuesto_id || '', descripcion: i.descripcion, cantidad: i.cantidad, precio_unitario: i.precio_unitario })))
          if (p.cliente_id) {
            const { data: vvs } = await supabase.from('vehiculos').select('id,patente,marca,modelo,anio').eq('cliente_id', p.cliente_id)
            setVehiculos(vvs || [])
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [id])

  async function loadVehiculos(clienteId) {
    const { data } = await supabase.from('vehiculos').select('id,patente,marca,modelo,anio').eq('cliente_id', clienteId)
    setVehiculos(data || [])
    setForm(prev => ({ ...prev, vehiculo_id: data?.[0]?.id || '' }))
  }

  function addItem() {
    const first = repuestosDB[0]
    setItems(prev => [...prev, { repuesto_id: first?.id || '', descripcion: first?.nombre || '', cantidad: 1, precio_unitario: first?.precio_unitario || 0 }])
  }

  function updateItem(i, field, val) {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      const updated = { ...item, [field]: val }
      if (field === 'repuesto_id') {
        const rep = repuestosDB.find(r => r.id === val)
        updated.descripcion = rep?.nombre || ''
        updated.precio_unitario = rep?.precio_unitario || 0
      }
      return updated
    }))
  }

  const totalRep = items.reduce((s, i) => s + (i.cantidad || 0) * (i.precio_unitario || 0), 0)
  const subtotal = totalRep + parseFloat(form.mano_de_obra || 0)
  const total = form.incluye_iva ? subtotal * 1.21 : subtotal

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { cliente_id: form.cliente_id || null, vehiculo_id: form.vehiculo_id || null, estado: form.estado, mano_de_obra: parseFloat(form.mano_de_obra) || 0, incluye_iva: form.incluye_iva, validez_dias: parseInt(form.validez_dias) || 30, notas: form.notas.trim() || null, user_id: user?.id }
    let presId = id
    if (id) {
      const { error } = await supabase.from('presupuestos').update(payload).eq('id', id)
      if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
    } else {
      const { data: p, error } = await supabase.from('presupuestos').insert(payload).select().single()
      if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
      presId = p.id
    }
    await supabase.from('presupuesto_items').delete().eq('presupuesto_id', presId)
    const rows = items.map(i => ({ presupuesto_id: presId, repuesto_id: i.repuesto_id || null, descripcion: i.descripcion || '', cantidad: i.cantidad, precio_unitario: i.precio_unitario }))
    if (rows.length) await supabase.from('presupuesto_items').insert(rows)
    showToast(id ? 'Presupuesto actualizado' : 'Presupuesto creado', 'success')
    onSaved(); onClose()
  }

  if (loading) return <Modal title={id ? 'Editar presupuesto' : 'Nuevo presupuesto'} onClose={onClose}><Spinner /></Modal>

  return (
    <Modal title={id ? 'Editar presupuesto' : 'Nuevo presupuesto'} onClose={onClose} width="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Cliente</label>
            <select value={form.cliente_id} onChange={e => { f('cliente_id')(e); if (e.target.value) loadVehiculos(e.target.value) }} className={inputCls}>
              <option value="">— Sin cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{[c.apellido, c.nombre].filter(Boolean).join(', ')}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Vehículo</label>
            <select value={form.vehiculo_id} onChange={f('vehiculo_id')} className={inputCls}>
              <option value="">— Sin vehículo —</option>
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} — {v.marca} {v.modelo}{v.anio ? ` (${v.anio})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select value={form.estado} onChange={f('estado')} className={inputCls}>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Mano de obra ($)</label>
            <input type="number" min={0} step={0.01} value={form.mano_de_obra} onChange={f('mano_de_obra')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Validez (días)</label>
            <input type="number" min={1} value={form.validez_dias} onChange={f('validez_dias')} className={inputCls} />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.incluye_iva} onChange={f('incluye_iva')} className="sr-only peer" />
              <div className="w-10 h-6 bg-surface-container-high peer-checked:bg-primary rounded-full transition-colors" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
            </label>
            <span className="text-sm text-on-surface">Incluye 21% IVA</span>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Notas / Observaciones</label>
            <textarea rows={2} value={form.notas} onChange={f('notas')} className={inputCls} placeholder="Notas del presupuesto…" />
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className={labelCls + ' mb-0'}>Ítems del presupuesto</p>
            <button type="button" onClick={addItem} className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">+ Agregar</button>
          </div>
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_80px_120px_40px_28px] gap-2 text-[10px] font-headline font-bold uppercase tracking-wider text-outline px-1">
                <span>Repuesto</span><span>Descripción</span><span>Cant.</span><span>Precio u.</span><span>Sub.</span><span></span>
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_80px_120px_40px_28px] gap-2 items-center">
                  <select value={item.repuesto_id} onChange={e => updateItem(i, 'repuesto_id', e.target.value)} className={inputCls + ' text-xs'}>
                    <option value="">— Libre —</option>
                    {repuestosDB.map(r => <option key={r.id} value={r.id}>{r.nombre}{r.codigo ? ` [${r.codigo}]` : ''}</option>)}
                  </select>
                  <input type="text" value={item.descripcion} onChange={e => updateItem(i, 'descripcion', e.target.value)} className={inputCls + ' text-xs'} placeholder="Descripción…" />
                  <input type="number" min={0.001} step={0.001} value={item.cantidad} onChange={e => updateItem(i, 'cantidad', parseFloat(e.target.value) || 0)} className={inputCls + ' text-xs'} />
                  <input type="number" min={0} step={0.01} value={item.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', parseFloat(e.target.value) || 0)} className={inputCls + ' text-xs'} />
                  <span className="text-xs font-bold text-primary text-right">{fmtMoney(item.cantidad * item.precio_unitario)}</span>
                  <button type="button" onClick={() => setItems(prev => prev.filter((_,idx) => idx !== i))} className="w-7 h-7 flex items-center justify-center text-error hover:bg-error/10 rounded-lg">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Totales */}
          <div className="mt-4 border-t border-white/5 pt-4 space-y-1 text-sm text-right">
            <div className="flex justify-end gap-8 text-on-surface-variant"><span>Repuestos:</span><span>{fmtMoney(totalRep)}</span></div>
            <div className="flex justify-end gap-8 text-on-surface-variant"><span>Mano de obra:</span><span>{fmtMoney(parseFloat(form.mano_de_obra) || 0)}</span></div>
            {form.incluye_iva && <div className="flex justify-end gap-8 text-on-surface-variant"><span>IVA 21%:</span><span>{fmtMoney(subtotal * 0.21)}</span></div>}
            <div className="flex justify-end gap-8 font-black text-lg text-primary"><span>Total:</span><span>{fmtMoney(total)}</span></div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cancelar</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dim text-on-primary-fixed font-bold text-sm rounded-xl flex items-center gap-2 disabled:opacity-60">
            {saving && <InlineSpinner />} {id ? 'Guardar cambios' : 'Crear presupuesto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteConfirm({ table, data, onClose, onDeleted, showToast }) {
  const [loading, setLoading] = useState(false)
  async function confirm() {
    setLoading(true)
    const { error } = await supabase.from(table).delete().eq('id', data.id)
    if (error) { showToast('Error: ' + error.message, 'error'); setLoading(false); return }
    showToast('Eliminado', 'success'); onDeleted(); onClose()
  }
  return (
    <Modal title="Confirmar eliminación" onClose={onClose} width="max-w-sm">
      <p className="text-sm text-on-surface mb-6">¿Eliminar este registro? Esta acción no se puede deshacer.</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cancelar</button>
        <button onClick={confirm} disabled={loading} className="px-4 py-2 text-sm font-bold bg-error/20 text-error border border-error/30 hover:bg-error/30 rounded-xl flex items-center gap-2">
          {loading && <InlineSpinner />} Sí, eliminar
        </button>
      </div>
    </Modal>
  )
}
