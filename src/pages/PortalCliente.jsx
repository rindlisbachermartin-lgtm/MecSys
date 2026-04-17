import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'
import { Badge } from '../components/Badge'
import { fmtMoney, fmtDateShort } from '../utils/helpers'

function fmtFecha(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function PortalCliente({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.rpc('get_portal_data', { p_token: token }).then(({ data: res, error: err }) => {
      if (err || res?.error) { setError(err?.message || res?.error); setLoading(false); return }
      setData(res)
      setLoading(false)
    })
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Spinner />
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-5xl text-outline block mb-4">link_off</span>
        <h1 className="text-xl font-bold text-on-surface mb-2">Enlace inválido</h1>
        <p className="text-sm text-on-surface-variant">Este portal no existe o fue desactivado.</p>
      </div>
    </div>
  )

  const { cliente, vehiculos, turnos, presupuestos, facturas } = data
  const nombre = [cliente?.apellido, cliente?.nombre].filter(Boolean).join(', ') || 'Cliente'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface-container-lowest border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
            <span className="material-symbols-outlined text-primary">engineering</span>
          </div>
          <div>
            <h1 className="font-headline text-lg font-black tracking-tighter text-on-surface">Portal del Cliente</h1>
            <p className="text-xs text-outline">Tu historial con el taller</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Bienvenida */}
        <div className="bg-surface-container-low border border-white/5 rounded-2xl p-6">
          <p className="text-xs text-outline uppercase tracking-widest font-bold mb-1">Bienvenido/a</p>
          <h2 className="text-2xl font-extrabold tracking-tighter text-on-surface">{nombre}</h2>
          {cliente?.telefono && <p className="text-sm text-on-surface-variant mt-1">📞 {cliente.telefono}</p>}
          {cliente?.email && <p className="text-sm text-on-surface-variant">✉ {cliente.email}</p>}
        </div>

        {/* Vehículos */}
        {vehiculos?.length > 0 && (
          <section>
            <h3 className="text-[11px] font-headline font-bold uppercase tracking-widest text-outline mb-3">Tus vehículos</h3>
            <div className="grid grid-cols-2 gap-3">
              {vehiculos.map(v => (
                <div key={v.id} className="bg-surface-container-lowest border border-white/5 rounded-xl p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">directions_car</span>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{v.patente}</p>
                    <p className="text-xs text-outline">{v.marca} {v.modelo}{v.anio ? ` (${v.anio})` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Turnos */}
        {turnos?.length > 0 && (
          <section>
            <h3 className="text-[11px] font-headline font-bold uppercase tracking-widest text-outline mb-3">Turnos</h3>
            <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container-low">
                  <tr>{['Fecha','Vehículo','Tareas','Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-headline font-bold uppercase tracking-wider text-outline">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {turnos.map(t => (
                    <tr key={t.id} className="border-t border-white/5">
                      <td className="px-4 py-3 text-sm text-on-surface whitespace-nowrap">{fmtFecha(t.fecha_hora)}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{t.vehiculo_id ? '—' : '—'}</td>
                      <td className="px-4 py-3 text-sm text-on-surface max-w-[200px] truncate">{t.tareas || '—'}</td>
                      <td className="px-4 py-3"><Badge estado={t.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Presupuestos */}
        {presupuestos?.length > 0 && (
          <section>
            <h3 className="text-[11px] font-headline font-bold uppercase tracking-widest text-outline mb-3">Presupuestos</h3>
            <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container-low">
                  <tr>{['Fecha','Total','Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-headline font-bold uppercase tracking-wider text-outline">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {presupuestos.map(p => (
                    <tr key={p.id} className="border-t border-white/5">
                      <td className="px-4 py-3 text-sm text-on-surface">{fmtFecha(p.created_at)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-primary">{p.total_general ? fmtMoney(p.total_general) : '—'}</td>
                      <td className="px-4 py-3"><Badge estado={p.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Facturas */}
        {facturas?.length > 0 && (
          <section>
            <h3 className="text-[11px] font-headline font-bold uppercase tracking-widest text-outline mb-3">Facturas</h3>
            <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-container-low">
                  <tr>{['N° Factura','Fecha','Total','Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-headline font-bold uppercase tracking-wider text-outline">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {facturas.map(f => (
                    <tr key={f.id} className="border-t border-white/5">
                      <td className="px-4 py-3 text-sm font-bold text-on-surface">{f.numero_factura || '—'}</td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{fmtFecha(f.created_at)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-primary">{f.total_general ? fmtMoney(f.total_general) : '—'}</td>
                      <td className="px-4 py-3"><Badge estado={f.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="text-center text-xs text-outline pb-8">Portal generado por MecSys · Sistema de gestión de talleres</p>
      </main>
    </div>
  )
}
