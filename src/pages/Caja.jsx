import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Modal } from '../components/Modal'
import { Spinner, InlineSpinner } from '../components/Spinner'
import { fmtMoney } from '../utils/helpers'

const inputCls = 'w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20'
const labelCls = 'block text-[11px] font-headline font-bold uppercase tracking-wider text-outline mb-1.5'

const CATS_INGRESO = ['Factura cobrada','Presupuesto cobrado','Pago adelantado','Otro ingreso']
const MEDIOS = ['efectivo','transferencia','debito','credito','otro']

export function Caja({ setTopbarAction }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [modal, setModal] = useState(null)

  useEffect(() => {
    setTopbarAction(
      <button onClick={() => setModal({ type: 'form', data: null, tipoPre: 'ingreso' })}
        className="bg-primary hover:bg-primary-dim text-on-primary-fixed px-3 md:px-5 py-2.5 rounded-xl font-headline font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 transition-all active:scale-95">
        <span className="material-symbols-outlined text-[18px]">add</span> <span className="hidden md:inline">Nuevo movimiento</span>
      </button>
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('caja_movimientos')
      .select('*')
      .eq('user_id', user?.id)
      .eq('fecha', fecha)
      .order('created_at', { ascending: false })
    setMovimientos(data || [])
    setLoading(false)
  }, [user?.id, fecha])

  useEffect(() => { load() }, [load])

  const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const egresos  = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
  const saldo    = ingresos - egresos

  async function del(id) {
    if (!confirm('¿Eliminar este movimiento?')) return
    const { error } = await supabase.from('caja_movimientos').delete().eq('id', id)
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    showToast('Eliminado', 'success'); load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-1">Caja Diaria</h2>
          <p className="text-sm text-on-surface-variant">Movimientos de caja del día</p>
        </div>
        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
          className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>

      {/* Resumen del día */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-low border border-white/5 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-400" />
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline mb-2">Ingresos</p>
          <p className="text-3xl font-extrabold text-green-400">{fmtMoney(ingresos)}</p>
        </div>
        <div className="bg-surface-container-low border border-white/5 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-400" />
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline mb-2">Egresos</p>
          <p className="text-3xl font-extrabold text-red-400">{fmtMoney(egresos)}</p>
        </div>
        <div className={`bg-surface-container-low border border-white/5 rounded-xl p-5 relative overflow-hidden`}>
          <div className={`absolute top-0 left-0 w-1 h-full ${saldo >= 0 ? 'bg-primary' : 'bg-error'}`} />
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline mb-2">Saldo del día</p>
          <p className={`text-3xl font-extrabold ${saldo >= 0 ? 'text-primary' : 'text-error'}`}>{fmtMoney(saldo)}</p>
        </div>
      </div>

      {/* Botones rápidos */}
      <div className="flex gap-3">
        <button onClick={() => setModal({ type: 'form', data: null, tipoPre: 'ingreso' })}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 rounded-xl transition-all">
          <span className="material-symbols-outlined text-[18px]">add_circle</span> Ingreso
        </button>
        <button onClick={() => setModal({ type: 'form', data: null, tipoPre: 'egreso' })}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 rounded-xl transition-all">
          <span className="material-symbols-outlined text-[18px]">remove_circle</span> Egreso
        </button>
      </div>

      {/* Lista de movimientos */}
      <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>{['Tipo','Categoría','Descripción','Medio de pago','Monto','Acciones'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-headline font-bold uppercase tracking-widest text-outline">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12"><Spinner /></td></tr>
            ) : movimientos.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center py-16 opacity-40">
                  <span className="material-symbols-outlined text-4xl text-outline mb-3">point_of_sale</span>
                  <p className="text-sm font-bold text-on-surface uppercase tracking-tight">Sin movimientos</p>
                </div>
              </td></tr>
            ) : movimientos.map(m => (
              <tr key={m.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                    m.tipo === 'ingreso'
                      ? 'bg-green-500/15 text-green-400 border-green-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}>{m.tipo}</span>
                </td>
                <td className="px-4 py-3 text-sm text-on-surface">{m.categoria}</td>
                <td className="px-4 py-3 text-sm text-on-surface-variant max-w-[200px] truncate">{m.descripcion || '—'}</td>
                <td className="px-4 py-3 text-sm text-on-surface-variant capitalize">{m.medio_pago}</td>
                <td className={`px-4 py-3 text-sm font-bold ${m.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'}`}>
                  {m.tipo === 'ingreso' ? '+' : '-'}{fmtMoney(m.monto)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ type: 'form', data: m, tipoPre: m.tipo })} className="px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg">Editar</button>
                    <button onClick={() => del(m.id)} className="px-2.5 py-1 text-xs font-bold text-error hover:bg-error/10 rounded-lg">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === 'form' && (
        <MovimientoForm
          data={modal.data}
          tipoPre={modal.tipoPre}
          fechaDefault={fecha}
          onClose={() => setModal(null)}
          onSaved={load}
          showToast={showToast}
          user={user}
        />
      )}
    </div>
  )
}

function MovimientoForm({ data, tipoPre, fechaDefault, onClose, onSaved, showToast, user }) {
  const [saving, setSaving] = useState(false)
  const CATS_EGRESO = ['Repuesto comprado','Sueldo','Alquiler','Servicio (luz/agua/gas)','Herramienta','Combustible','Otro gasto']
  const [form, setForm] = useState({
    tipo:        data?.tipo        || tipoPre || 'ingreso',
    categoria:   data?.categoria   || '',
    descripcion: data?.descripcion || '',
    monto:       data?.monto       || '',
    medio_pago:  data?.medio_pago  || 'efectivo',
    fecha:       data?.fecha       || fechaDefault,
  })
  const f = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const cats = form.tipo === 'ingreso' ? CATS_INGRESO : CATS_EGRESO

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      user_id: user?.id,
      tipo: form.tipo,
      categoria: form.categoria || cats[0],
      descripcion: form.descripcion.trim() || null,
      monto: parseFloat(form.monto),
      medio_pago: form.medio_pago,
      fecha: form.fecha,
    }
    const { error } = data?.id
      ? await supabase.from('caja_movimientos').update(payload).eq('id', data.id)
      : await supabase.from('caja_movimientos').insert(payload)
    if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
    showToast(data?.id ? 'Movimiento actualizado' : 'Movimiento registrado', 'success')
    onSaved(); onClose()
  }

  return (
    <Modal title={data?.id ? 'Editar movimiento' : tipoPre === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo egreso'} onClose={onClose} width="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Tipo</label>
            <select value={form.tipo} onChange={f('tipo')} className={inputCls}>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" value={form.fecha} onChange={f('fecha')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Categoría</label>
            <select value={form.categoria} onChange={f('categoria')} className={inputCls}>
              <option value="">— Seleccionar —</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Medio de pago</label>
            <select value={form.medio_pago} onChange={f('medio_pago')} className={inputCls}>
              {MEDIOS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Descripción</label>
            <input type="text" value={form.descripcion} onChange={f('descripcion')} className={inputCls} placeholder="Detalle opcional…" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Monto ($) *</label>
            <input required type="number" min={0.01} step={0.01} value={form.monto} onChange={f('monto')} className={inputCls} placeholder="0.00" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cancelar</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dim text-on-primary-fixed font-bold text-sm rounded-xl flex items-center gap-2 disabled:opacity-60">
            {saving && <InlineSpinner />} {data?.id ? 'Guardar' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
