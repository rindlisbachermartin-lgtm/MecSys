import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Modal } from '../components/Modal'
import { Spinner, InlineSpinner } from '../components/Spinner'
import { fmtMoney } from '../utils/helpers'
import { MARCAS, MARCAS_MODELOS } from '../data/marcas-modelos'

const inputCls = 'w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20'
const labelCls = 'block text-[11px] font-headline font-bold uppercase tracking-wider text-outline mb-1.5'
const COMBUSTIBLES = ['cualquiera','nafta','diesel','gnc','eléctrico','híbrido']

export function Repuestos({ searchQuery, setTopbarAction }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [repuestos, setRepuestos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    setTopbarAction(
      <button onClick={() => setModal({ type: 'form', data: null })}
        className="bg-primary hover:bg-primary-dim text-on-primary-fixed px-3 md:px-5 py-2.5 rounded-xl font-headline font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 transition-all active:scale-95">
        <span className="material-symbols-outlined text-[18px]">add</span> <span className="hidden md:inline">Nuevo repuesto</span>
      </button>
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('repuestos').select('*,repuesto_compatibilidades(*)').eq('user_id', user?.id).order('nombre')
    let all = data || []
    if (searchQuery) {
      const s = searchQuery.toLowerCase()
      all = all.filter(r =>
        r.nombre?.toLowerCase().includes(s) ||
        r.codigo?.toLowerCase().includes(s) ||
        (r.repuesto_compatibilidades || []).some(c => c.marca?.toLowerCase().includes(s) || c.modelo?.toLowerCase().includes(s))
      )
    }
    setRepuestos(all)
    setLoading(false)
  }, [user?.id, searchQuery])

  useEffect(() => { load() }, [load])

  async function del(r) {
    if (!confirm(`¿Eliminar "${r.nombre}"?`)) return
    const { error } = await supabase.from('repuestos').delete().eq('id', r.id)
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    showToast('Repuesto eliminado', 'success'); load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-1">Repuestos</h2>
          <p className="text-sm text-on-surface-variant">Catálogo de repuestos y compatibilidades</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>
              {['Código','Nombre','Compatibilidades','Precio','Stock','Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-headline font-bold uppercase tracking-widest text-outline">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12"><Spinner /></td></tr>
            ) : repuestos.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center py-16 opacity-40">
                  <span className="material-symbols-outlined text-4xl text-outline mb-3">settings_input_component</span>
                  <p className="text-sm font-bold text-on-surface uppercase tracking-tight">Sin repuestos</p>
                </div>
              </td></tr>
            ) : repuestos.map(r => {
              const compat = r.repuesto_compatibilidades || []
              return (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-xs text-outline font-mono">{r.codigo || '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold text-on-surface">{r.nombre}</td>
                  <td className="px-4 py-3 max-w-[220px]">
                    {compat.length === 0 ? (
                      <span className="text-xs text-outline italic">Universal</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {compat.slice(0, 3).map((c, i) => (
                          <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                            {[c.marca, c.modelo].filter(Boolean).join(' ')}{c.anio_desde ? ` (${c.anio_desde}${c.anio_hasta ? '–'+c.anio_hasta : '+'})` : ''}
                          </span>
                        ))}
                        {compat.length > 3 && <span className="text-[10px] text-outline">+{compat.length - 3}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-primary">{fmtMoney(r.precio_unitario)}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{r.stock_actual ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ type: 'form', data: r })}
                        className="px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg">Editar</button>
                      <button onClick={() => del(r)}
                        className="px-2.5 py-1 text-xs font-bold text-error hover:bg-error/10 rounded-lg">Eliminar</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal?.type === 'form' && (
        <RepuestoForm data={modal.data} onClose={() => setModal(null)} onSaved={load} showToast={showToast} user={user} />
      )}
    </div>
  )
}

function RepuestoForm({ data, onClose, onSaved, showToast, user }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: data?.nombre || '',
    codigo: data?.codigo || '',
    precio_unitario: data?.precio_unitario || 0,
    stock_actual: data?.stock_actual || '',
  })
  const [compatibilidades, setCompatibilidades] = useState([])

  useEffect(() => {
    if (data?.id) {
      supabase.from('repuesto_compatibilidades').select('*').eq('repuesto_id', data.id)
        .then(({ data: c }) => setCompatibilidades(c || []))
    }
  }, [data?.id])

  const f = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))

  function addCompat() {
    setCompatibilidades(prev => [...prev, { id: null, marca: '', modelo: '', anio_desde: '', anio_hasta: '', combustible: 'cualquiera' }])
  }

  function updateCompat(i, field, val) {
    setCompatibilidades(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val, ...(field === 'marca' ? { modelo: '' } : {}) } : c))
  }

  function removeCompat(i) {
    setCompatibilidades(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { nombre: form.nombre.trim(), codigo: form.codigo.trim() || null, precio_unitario: parseFloat(form.precio_unitario) || 0, stock_actual: form.stock_actual !== '' ? parseFloat(form.stock_actual) : null, user_id: user?.id }
    let repId = data?.id
    if (data?.id) {
      const { error } = await supabase.from('repuestos').update(payload).eq('id', data.id)
      if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
    } else {
      const { data: r, error } = await supabase.from('repuestos').insert(payload).select().single()
      if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }
      repId = r.id
    }
    // Sync compatibilidades
    await supabase.from('repuesto_compatibilidades').delete().eq('repuesto_id', repId)
    const rows = compatibilidades.filter(c => c.marca || c.modelo).map(c => ({
      repuesto_id: repId, user_id: user?.id,
      marca: c.marca || null, modelo: c.modelo || null,
      anio_desde: c.anio_desde ? parseInt(c.anio_desde) : null,
      anio_hasta: c.anio_hasta ? parseInt(c.anio_hasta) : null,
      combustible: c.combustible || 'cualquiera',
    }))
    if (rows.length) await supabase.from('repuesto_compatibilidades').insert(rows)
    showToast(data?.id ? 'Repuesto actualizado' : 'Repuesto creado', 'success')
    onSaved(); onClose()
  }

  return (
    <Modal title={data?.id ? 'Editar repuesto' : 'Nuevo repuesto'} onClose={onClose} width="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Nombre *</label>
            <input required type="text" value={form.nombre} onChange={f('nombre')} className={inputCls} placeholder="Filtro de aceite, pastillas de freno…" />
          </div>
          <div><label className={labelCls}>Código / Referencia</label><input type="text" value={form.codigo} onChange={f('codigo')} className={inputCls} placeholder="OEM-12345" /></div>
          <div><label className={labelCls}>Precio unitario ($)</label><input type="number" min={0} step={0.01} value={form.precio_unitario} onChange={f('precio_unitario')} className={inputCls} /></div>
          <div><label className={labelCls}>Stock actual</label><input type="number" min={0} step={0.001} value={form.stock_actual} onChange={f('stock_actual')} className={inputCls} placeholder="0" /></div>
        </div>

        {/* Compatibilidades */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className={labelCls + ' mb-0'}>Compatibilidades de vehículos</p>
            <button type="button" onClick={addCompat} className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">+ Agregar</button>
          </div>
          {compatibilidades.length === 0 ? (
            <p className="text-xs text-outline italic">Sin compatibilidades específicas — el repuesto será universal.</p>
          ) : (
            <div className="space-y-2">
              {compatibilidades.map((c, i) => {
                const modelos = MARCAS_MODELOS[c.marca] || []
                return (
                  <div key={i} className="grid grid-cols-[1fr_1fr_80px_80px_120px_28px] gap-2 items-center bg-surface-container-low border border-white/5 rounded-xl p-3">
                    <div>
                      <select value={c.marca} onChange={e => updateCompat(i, 'marca', e.target.value)} className={inputCls + ' text-xs'}>
                        <option value="">— Marca —</option>
                        {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
                        <option value="__otra__">Otra…</option>
                      </select>
                      {c.marca === '__otra__' && <input type="text" placeholder="Escribí la marca" className={inputCls + ' text-xs mt-1'} onChange={e => updateCompat(i, 'marca', e.target.value)} />}
                    </div>
                    <div>
                      {(c.marca && c.marca !== '__otra__' && modelos.length > 0) ? (
                        <select value={c.modelo} onChange={e => updateCompat(i, 'modelo', e.target.value)} className={inputCls + ' text-xs'}>
                          <option value="">— Modelo —</option>
                          {modelos.map(m => <option key={m} value={m}>{m}</option>)}
                          <option value="__otro__">Otro…</option>
                        </select>
                      ) : (
                        <input type="text" placeholder="Modelo" value={c.modelo} onChange={e => updateCompat(i, 'modelo', e.target.value)} className={inputCls + ' text-xs'} />
                      )}
                    </div>
                    <input type="number" placeholder="Desde" value={c.anio_desde} onChange={e => updateCompat(i, 'anio_desde', e.target.value)} min={1900} max={2100} className={inputCls + ' text-xs'} />
                    <input type="number" placeholder="Hasta" value={c.anio_hasta} onChange={e => updateCompat(i, 'anio_hasta', e.target.value)} min={1900} max={2100} className={inputCls + ' text-xs'} />
                    <select value={c.combustible || 'cualquiera'} onChange={e => updateCompat(i, 'combustible', e.target.value)} className={inputCls + ' text-xs'}>
                      {COMBUSTIBLES.map(cb => <option key={cb} value={cb}>{cb}</option>)}
                    </select>
                    <button type="button" onClick={() => removeCompat(i)} className="w-7 h-7 flex items-center justify-center text-error hover:bg-error/10 rounded-lg">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cancelar</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dim text-on-primary-fixed font-bold text-sm rounded-xl flex items-center gap-2 disabled:opacity-60">
            {saving && <InlineSpinner />} {data?.id ? 'Guardar cambios' : 'Crear repuesto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
