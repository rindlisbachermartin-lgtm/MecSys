import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Modal } from '../components/Modal'
import { Spinner, InlineSpinner } from '../components/Spinner'
import { fmtMoney } from '../utils/helpers'

const inputCls = 'w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20'
const labelCls = 'block text-[11px] font-headline font-bold uppercase tracking-wider text-outline mb-1.5'

const CATS_EGRESO = [
  'Repuesto comprado','Herramienta','Alquiler','Sueldo','Servicio (luz/agua/gas)',
  'Combustible','Publicidad','Mantenimiento','Impuesto / tasa','Otro gasto'
]
const MEDIOS = ['efectivo','transferencia','debito','credito','otro']

const now = new Date()
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export function Gastos({ setTopbarAction }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mes, setMes] = useState(now.getMonth())
  const [anio, setAnio] = useState(now.getFullYear())
  const [modal, setModal] = useState(null)

  useEffect(() => {
    setTopbarAction(
      <button onClick={() => setModal({ type: 'form', data: null })}
        className="bg-primary hover:bg-primary-dim text-on-primary-fixed px-3 md:px-5 py-2.5 rounded-xl font-headline font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 transition-all active:scale-95">
        <span className="material-symbols-outlined text-[18px]">add</span> <span className="hidden md:inline">Nuevo gasto</span>
      </button>
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const desde = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
    const hasta = new Date(anio, mes + 1, 0).toISOString().split('T')[0]
    const { data } = await supabase
      .from('caja_movimientos')
      .select('*')
      .eq('user_id', user?.id)
      .eq('tipo', 'egreso')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
    setGastos(data || [])
    setLoading(false)
  }, [user?.id, mes, anio])

  useEffect(() => { load() }, [load])

  const total = gastos.reduce((s, g) => s + g.monto, 0)

  // Agrupado por categoría
  const porCat = {}
  gastos.forEach(g => {
    if (!porCat[g.categoria]) porCat[g.categoria] = 0
    porCat[g.categoria] += g.monto
  })
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1])

  async function del(id) {
    if (!confirm('¿Eliminar este gasto?')) return
    const { error } = await supabase.from('caja_movimientos').delete().eq('id', id)
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    showToast('Gasto eliminado', 'success'); load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-1">Gastos del Taller</h2>
          <p className="text-sm text-on-surface-variant">Egresos operativos mensuales</p>
        </div>
        {/* Selector mes/año */}
        <div className="flex items-center gap-2">
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none">
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))}
            className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none">
            {[anio - 2, anio - 1, anio, anio + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface-container-low border border-white/5 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-400" />
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline mb-2">Total del mes</p>
          <p className="text-3xl font-extrabold text-red-400">{fmtMoney(total)}</p>
          <p className="text-xs text-outline mt-1">{MESES[mes]} {anio} · {gastos.length} registros</p>
        </div>
        {/* Top categoría */}
        {cats[0] && (
          <div className="bg-surface-container-low border border-white/5 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400" />
            <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline mb-2">Mayor gasto</p>
            <p className="text-xl font-extrabold text-yellow-400">{cats[0][0]}</p>
            <p className="text-sm text-on-surface-variant mt-1">{fmtMoney(cats[0][1])}</p>
          </div>
        )}
      </div>

      {/* Resumen por categoría */}
      {cats.length > 0 && (
        <div className="bg-surface-container-lowest border border-white/5 rounded-xl p-5">
          <p className={labelCls + ' mb-4'}>Por categoría</p>
          <div className="space-y-2">
            {cats.map(([cat, monto]) => {
              const pct = total > 0 ? (monto / total) * 100 : 0
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs text-on-surface-variant mb-1">
                    <span className="font-medium">{cat}</span>
                    <span className="font-bold text-on-surface">{fmtMoney(monto)} <span className="text-outline">({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-red-400/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>{['Fecha','Categoría','Descripción','Medio de pago','Monto','Acciones'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-headline font-bold uppercase tracking-widest text-outline">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12"><Spinner /></td></tr>
            ) : gastos.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center py-16 opacity-40">
                  <span className="material-symbols-outlined text-4xl text-outline mb-3">payments</span>
                  <p className="text-sm font-bold text-on-surface uppercase tracking-tight">Sin gastos este mes</p>
                </div>
              </td></tr>
            ) : gastos.map(g => (
              <tr key={g.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-sm text-on-surface whitespace-nowrap">
                  {new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                </td>
                <td className="px-4 py-3 text-sm text-on-surface">{g.categoria}</td>
                <td className="px-4 py-3 text-sm text-on-surface-variant max-w-[200px] truncate">{g.descripcion || '—'}</td>
                <td className="px-4 py-3 text-sm text-on-surface-variant capitalize">{g.medio_pago}</td>
                <td className="px-4 py-3 text-sm font-bold text-red-400">-{fmtMoney(g.monto)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ type: 'form', data: g })} className="px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg">Editar</button>
                    <button onClick={() => del(g.id)} className="px-2.5 py-1 text-xs font-bold text-error hover:bg-error/10 rounded-lg">Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.type === 'form' && (
        <GastoForm data={modal.data} mesPre={mes} anioPre={anio} onClose={() => setModal(null)} onSaved={load} showToast={showToast} user={user} />
      )}
    </div>
  )
}

function GastoForm({ data, mesPre, anioPre, onClose, onSaved, showToast, user }) {
  const [saving, setSaving] = useState(false)
  const defaultFecha = `${anioPre}-${String(mesPre + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
  const [form, setForm] = useState({
    categoria:   data?.categoria   || '',
    descripcion: data?.descripcion || '',
    monto:       data?.monto       || '',
    medio_pago:  data?.medio_pago  || 'efectivo',
    fecha:       data?.fecha       || defaultFecha,
  })
  const f = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      user_id: user?.id,
      tipo: 'egreso',
      categoria: form.categoria || 'Otro gasto',
      descripcion: form.descripcion.trim() || null,
      monto: parseFloat(form.monto),
      medio_pago: form.medio_pago,
      fecha: form.fecha,
    }
    const { error } = data?.id
      ? await supabase.from('caja_movimientos').update(payload).eq('id', data.id)
      : await supabase.from('caja_movimientos').insert(payload)
    if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
    showToast(data?.id ? 'Gasto actualizado' : 'Gasto registrado', 'success')
    onSaved(); onClose()
  }

  return (
    <Modal title={data?.id ? 'Editar gasto' : 'Nuevo gasto'} onClose={onClose} width="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" value={form.fecha} onChange={f('fecha')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Categoría</label>
            <select value={form.categoria} onChange={f('categoria')} className={inputCls}>
              <option value="">— Seleccionar —</option>
              {CATS_EGRESO.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Medio de pago</label>
            <select value={form.medio_pago} onChange={f('medio_pago')} className={inputCls}>
              {MEDIOS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Monto ($) *</label>
            <input required type="number" min={0.01} step={0.01} value={form.monto} onChange={f('monto')} className={inputCls} placeholder="0.00" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Descripción</label>
            <input type="text" value={form.descripcion} onChange={f('descripcion')} className={inputCls} placeholder="Detalle del gasto…" />
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
