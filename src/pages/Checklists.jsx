import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Modal } from '../components/Modal'
import { Badge } from '../components/Badge'
import { Spinner, InlineSpinner } from '../components/Spinner'

const inputCls = 'w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20'
const labelCls = 'block text-[11px] font-headline font-bold uppercase tracking-wider text-outline mb-1.5'

const PLANTILLA = [
  { categoria: 'Motor',       items: ['Nivel de aceite', 'Filtro de aceite', 'Correa de distribución', 'Refrigerante', 'Bujías'] },
  { categoria: 'Frenos',      items: ['Pastillas delanteras', 'Pastillas traseras', 'Discos', 'Líquido de frenos', 'Freno de mano'] },
  { categoria: 'Suspensión',  items: ['Amortiguadores delanteros', 'Amortiguadores traseros', 'Rótulas', 'Barra estabilizadora'] },
  { categoria: 'Eléctrico',   items: ['Batería', 'Alternador', 'Luces delanteras', 'Luces traseras', 'Señales/giros'] },
  { categoria: 'Neumáticos',  items: ['Delantera izquierda', 'Delantera derecha', 'Trasera izquierda', 'Trasera derecha', 'Auxilio'] },
  { categoria: 'Carrocería',  items: ['Parabrisas', 'Limpiaparabrisas', 'Espejos', 'Estado general'] },
]

const ESTADOS_ITEM = [
  { value: 'ok',       label: 'OK',      color: 'bg-green-500/15 text-green-400 border-green-500/30'  },
  { value: 'atencion', label: 'Atención',color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'},
  { value: 'critico',  label: 'Crítico', color: 'bg-red-500/15 text-red-400 border-red-500/30'        },
  { value: 'na',       label: 'N/A',     color: 'bg-outline/10 text-outline border-outline/20'        },
]

function estadoStyle(v) {
  return ESTADOS_ITEM.find(e => e.value === v)?.color || ''
}

export function Checklists({ searchQuery, setTopbarAction }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    setTopbarAction(
      <button onClick={() => setModal({ type: 'form', data: null })}
        className="bg-primary hover:bg-primary-dim text-on-primary-fixed px-3 md:px-5 py-2.5 rounded-xl font-headline font-bold uppercase text-[11px] tracking-widest flex items-center gap-2 transition-all active:scale-95">
        <span className="material-symbols-outlined text-[18px]">add</span> <span className="hidden md:inline">Nueva revisión</span>
      </button>
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('checklists')
      .select('*,vehiculos(patente,marca,modelo),clientes(nombre,apellido)')
      .eq('user_id', user?.id)
      .order('fecha', { ascending: false })
    let all = data || []
    if (searchQuery) {
      const s = searchQuery.toLowerCase()
      all = all.filter(c =>
        c.vehiculos?.patente?.toLowerCase().includes(s) ||
        c.clientes?.nombre?.toLowerCase().includes(s) ||
        c.clientes?.apellido?.toLowerCase().includes(s)
      )
    }
    setLista(all)
    setLoading(false)
  }, [user?.id, searchQuery])

  useEffect(() => { load() }, [load])

  async function del(id) {
    if (!confirm('¿Eliminar esta revisión?')) return
    const { error } = await supabase.from('checklists').delete().eq('id', id)
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    showToast('Revisión eliminada', 'success'); load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-1">Checklists</h2>
        <p className="text-sm text-on-surface-variant">Revisiones de ingreso de vehículos</p>
      </div>

      <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container-low">
            <tr>{['Fecha','Vehículo','Cliente','Km','Alertas','Acciones'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-headline font-bold uppercase tracking-widest text-outline">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12"><Spinner /></td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="flex flex-col items-center py-16 opacity-40">
                  <span className="material-symbols-outlined text-4xl text-outline mb-3">checklist</span>
                  <p className="text-sm font-bold text-on-surface uppercase tracking-tight">Sin revisiones</p>
                </div>
              </td></tr>
            ) : lista.map(c => {
              const alertas = (c.alertas_atencion || 0) + (c.alertas_critico || 0)
              return (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm text-on-surface whitespace-nowrap">
                    {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-on-surface">{c.vehiculos?.patente || '—'}</p>
                    <p className="text-xs text-outline">{c.vehiculos?.marca} {c.vehiculos?.modelo}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">
                    {[c.clientes?.apellido, c.clientes?.nombre].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">
                    {c.kilometraje ? c.kilometraje.toLocaleString('es-AR') + ' km' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {alertas > 0 ? (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                        ⚠ {alertas} alerta{alertas !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30">✓ Todo OK</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ type: 'view', data: c })} className="px-2.5 py-1 text-xs font-bold text-on-surface-variant hover:bg-white/5 rounded-lg">Ver</button>
                      <button onClick={() => del(c.id)} className="px-2.5 py-1 text-xs font-bold text-error hover:bg-error/10 rounded-lg">Eliminar</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal?.type === 'form' && <ChecklistForm data={modal.data} onClose={() => setModal(null)} onSaved={load} showToast={showToast} user={user} />}
      {modal?.type === 'view' && <ChecklistView id={modal.data.id} onClose={() => setModal(null)} />}
    </div>
  )
}

// ── Formulario ────────────────────────────────────────────────
function ChecklistForm({ onClose, onSaved, showToast, user }) {
  const [saving, setSaving] = useState(false)
  const [vehiculos, setVehiculos] = useState([])
  const [clientes, setClientes] = useState([])
  const [form, setForm] = useState({
    vehiculo_id: '', cliente_id: '', turno_id: '',
    fecha: new Date().toISOString().split('T')[0],
    kilometraje: '', notas: ''
  })
  const [items, setItems] = useState(() =>
    PLANTILLA.flatMap(cat => cat.items.map(item => ({
      categoria: cat.categoria, item, estado: 'ok', observacion: ''
    })))
  )
  const f = k => e => setForm(prev => ({ ...prev, [k]: e.target.value }))

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('id,nombre,apellido').eq('user_id', user?.id).order('apellido'),
      supabase.from('vehiculos').select('id,patente,marca,modelo,cliente_id').eq('user_id', user?.id).order('patente'),
    ]).then(([{ data: cls }, { data: vehs }]) => {
      setClientes(cls || [])
      setVehiculos(vehs || [])
    })
  }, [])

  function setItemEstado(idx, val) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, estado: val } : it))
  }
  function setItemObs(idx, val) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, observacion: val } : it))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { data: cl, error } = await supabase.from('checklists').insert({
      user_id: user?.id,
      vehiculo_id: form.vehiculo_id || null,
      cliente_id: form.cliente_id || null,
      fecha: form.fecha,
      kilometraje: form.kilometraje ? parseInt(form.kilometraje) : null,
      notas: form.notas.trim() || null,
      alertas_atencion: items.filter(i => i.estado === 'atencion').length,
      alertas_critico: items.filter(i => i.estado === 'critico').length,
    }).select().single()

    if (error) { showToast('Error: ' + error.message, 'error'); setSaving(false); return }

    const rows = items.map(it => ({
      checklist_id: cl.id,
      categoria: it.categoria,
      item: it.item,
      estado: it.estado,
      observacion: it.observacion.trim() || null,
    }))
    await supabase.from('checklist_items').insert(rows)
    showToast('Revisión creada', 'success')
    onSaved(); onClose()
  }

  const porCategoria = PLANTILLA.map(cat => ({
    ...cat,
    idxStart: PLANTILLA.slice(0, PLANTILLA.indexOf(cat)).reduce((s, c) => s + c.items.length, 0)
  }))

  return (
    <Modal title="Nueva revisión" onClose={onClose} width="max-w-4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cabecera */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Cliente</label>
            <select value={form.cliente_id} onChange={f('cliente_id')} className={inputCls}>
              <option value="">— Sin cliente —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{[c.apellido, c.nombre].filter(Boolean).join(', ')}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Vehículo</label>
            <select value={form.vehiculo_id} onChange={f('vehiculo_id')} className={inputCls}>
              <option value="">— Sin vehículo —</option>
              {vehiculos.map(v => <option key={v.id} value={v.id}>{v.patente} — {v.marca} {v.modelo}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" value={form.fecha} onChange={f('fecha')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Kilometraje</label>
            <input type="number" value={form.kilometraje} onChange={f('kilometraje')} min={0} className={inputCls} placeholder="85000" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Observaciones generales</label>
            <textarea rows={2} value={form.notas} onChange={f('notas')} className={inputCls} placeholder="Notas adicionales…" />
          </div>
        </div>

        {/* Items por categoría */}
        <div className="space-y-4">
          <p className={labelCls}>Ítems de revisión</p>
          {porCategoria.map(cat => (
            <div key={cat.categoria} className="bg-surface-container rounded-xl border border-white/5 overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-container-low border-b border-white/5">
                <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline">{cat.categoria}</p>
              </div>
              <div className="divide-y divide-white/5">
                {cat.items.map((item, i) => {
                  const idx = cat.idxStart + i
                  const it = items[idx]
                  return (
                    <div key={item} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="text-sm text-on-surface flex-1">{item}</span>
                      <div className="flex gap-1">
                        {ESTADOS_ITEM.map(e => (
                          <button type="button" key={e.value}
                            onClick={() => setItemEstado(idx, e.value)}
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                              it.estado === e.value ? e.color : 'border-white/10 text-outline hover:border-white/20'
                            }`}>
                            {e.label}
                          </button>
                        ))}
                      </div>
                      {(it.estado === 'atencion' || it.estado === 'critico') && (
                        <input type="text" value={it.observacion}
                          onChange={e => setItemObs(idx, e.target.value)}
                          className="w-40 bg-surface-container-low border border-outline-variant/30 rounded-lg px-2.5 py-1.5 text-xs text-on-surface"
                          placeholder="Observación…" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cancelar</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dim text-on-primary-fixed font-bold text-sm rounded-xl flex items-center gap-2 disabled:opacity-60">
            {saving && <InlineSpinner />} Guardar revisión
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Vista de detalle ─────────────────────────────────────────
function ChecklistView({ id, onClose }) {
  const [cl, setCl] = useState(null)
  const [items, setItems] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.from('checklists').select('*,vehiculos(patente,marca,modelo),clientes(nombre,apellido)').eq('id', id).single(),
      supabase.from('checklist_items').select('*').eq('checklist_id', id).order('categoria').order('item'),
    ]).then(([{ data: c }, { data: its }]) => { setCl(c); setItems(its || []) })
  }, [id])

  if (!cl) return <Modal title="Revisión" onClose={onClose}><Spinner /></Modal>

  const categorias = [...new Set(items.map(i => i.categoria))]

  return (
    <Modal title={`Revisión — ${cl.vehiculos?.patente || '—'}`} onClose={onClose} width="max-w-3xl">
      <div className="space-y-4">
        {/* Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
          <div><p className={labelCls}>Vehículo</p><p className="text-sm font-bold text-on-surface">{cl.vehiculos?.patente} — {cl.vehiculos?.marca} {cl.vehiculos?.modelo}</p></div>
          <div><p className={labelCls}>Cliente</p><p className="text-sm text-on-surface">{[cl.clientes?.apellido, cl.clientes?.nombre].filter(Boolean).join(', ') || '—'}</p></div>
          <div><p className={labelCls}>Fecha</p><p className="text-sm text-on-surface">{new Date(cl.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</p></div>
          {cl.kilometraje && <div><p className={labelCls}>Km</p><p className="text-sm text-on-surface">{cl.kilometraje.toLocaleString('es-AR')} km</p></div>}
          {cl.notas && <div className="col-span-3"><p className={labelCls}>Observaciones</p><p className="text-sm text-on-surface bg-surface-container-low rounded-xl p-3">{cl.notas}</p></div>}
        </div>

        {/* Items */}
        {categorias.map(cat => (
          <div key={cat} className="bg-surface-container rounded-xl border border-white/5 overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-container-low border-b border-white/5">
              <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline">{cat}</p>
            </div>
            <div className="divide-y divide-white/5">
              {items.filter(i => i.categoria === cat).map(it => (
                <div key={it.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm text-on-surface">{it.item}</span>
                  <div className="flex items-center gap-2">
                    {it.observacion && <span className="text-xs text-outline italic">{it.observacion}</span>}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${estadoStyle(it.estado)}`}>
                      {ESTADOS_ITEM.find(e => e.value === it.estado)?.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-4 border-t border-white/5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-white/5 rounded-xl">Cerrar</button>
        </div>
      </div>
    </Modal>
  )
}
