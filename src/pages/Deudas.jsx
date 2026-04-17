import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Spinner } from '../components/Spinner'
import { fmtMoney, fmtDateShort } from '../utils/helpers'

const labelCls = 'block text-[11px] font-headline font-bold uppercase tracking-wider text-outline mb-1.5'

export function Deudas({ setTopbarAction }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [deudas, setDeudas] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagando, setPagando] = useState({})

  useEffect(() => { setTopbarAction(null) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    // Facturas pendientes agrupadas por cliente
    const { data } = await supabase
      .from('v_facturas_totales')
      .select('id,created_at,cliente_nombre,total_general,numero_factura,estado')
      .eq('user_id', user?.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })

    // Agrupar por cliente
    const grupos = {}
    ;(data || []).forEach(f => {
      const key = f.cliente_nombre || '(Sin cliente)'
      if (!grupos[key]) grupos[key] = { cliente: key, facturas: [], total: 0 }
      grupos[key].facturas.push(f)
      grupos[key].total += f.total_general || 0
    })
    setDeudas(Object.values(grupos).sort((a, b) => b.total - a.total))
    setLoading(false)
  }, [user?.id])

  useEffect(() => { load() }, [load])

  async function marcarPagada(facturaId) {
    setPagando(prev => ({ ...prev, [facturaId]: true }))
    const { error } = await supabase.from('facturas').update({ estado: 'pagada' }).eq('id', facturaId)
    if (error) { showToast('Error: ' + error.message, 'error') }
    else { showToast('Factura marcada como pagada', 'success'); load() }
    setPagando(prev => ({ ...prev, [facturaId]: false }))
  }

  const totalDeuda = deudas.reduce((s, d) => s + d.total, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-1">Deudas de Clientes</h2>
        <p className="text-sm text-on-surface-variant">Facturas pendientes de cobro</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-low border border-white/5 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-400" />
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline mb-2">Total adeudado</p>
          <p className="text-3xl font-extrabold text-red-400">{fmtMoney(totalDeuda)}</p>
        </div>
        <div className="bg-surface-container-low border border-white/5 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400" />
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline mb-2">Clientes con deuda</p>
          <p className="text-3xl font-extrabold text-yellow-400">{deudas.length}</p>
        </div>
        <div className="bg-surface-container-low border border-white/5 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-outline" />
          <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-outline mb-2">Facturas pendientes</p>
          <p className="text-3xl font-extrabold text-on-surface">{deudas.reduce((s, d) => s + d.facturas.length, 0)}</p>
        </div>
      </div>

      {/* Lista */}
      {loading ? <Spinner /> : deudas.length === 0 ? (
        <div className="flex flex-col items-center py-24 opacity-40">
          <span className="material-symbols-outlined text-5xl text-outline mb-4">task_alt</span>
          <p className="text-sm font-bold text-on-surface uppercase tracking-tight">Sin deudas pendientes</p>
          <p className="text-xs text-outline mt-1">Todos los clientes están al día 🎉</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deudas.map(grupo => (
            <div key={grupo.cliente} className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden">
              {/* Header del cliente */}
              <div className="px-6 py-4 bg-surface-container-low border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-error/15 rounded-xl flex items-center justify-center border border-error/20">
                    <span className="material-symbols-outlined text-error text-[18px]">person</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{grupo.cliente}</p>
                    <p className="text-[11px] text-outline">{grupo.facturas.length} factura{grupo.facturas.length !== 1 ? 's' : ''} pendiente{grupo.facturas.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-0.5">Total deuda</p>
                  <p className="text-xl font-extrabold text-red-400">{fmtMoney(grupo.total)}</p>
                </div>
              </div>

              {/* Facturas */}
              <div className="divide-y divide-white/5">
                {grupo.facturas.map(f => (
                  <div key={f.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-white/5">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-on-surface">
                        {f.numero_factura ? `Factura ${f.numero_factura}` : 'Sin número'}
                      </p>
                      <p className="text-xs text-outline">{fmtDateShort(f.created_at)}</p>
                    </div>
                    <p className="text-sm font-bold text-red-400">{fmtMoney(f.total_general)}</p>
                    <button
                      onClick={() => marcarPagada(f.id)}
                      disabled={pagando[f.id]}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-400 hover:bg-green-500/10 border border-green-500/25 rounded-lg transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      {pagando[f.id] ? 'Guardando…' : 'Marcar pagada'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
