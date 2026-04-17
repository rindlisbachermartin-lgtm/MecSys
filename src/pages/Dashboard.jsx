import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { weekRange, DIAS, MESES, MESES_FULL, DIAS_FULL, fmtMoney } from '../utils/helpers'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

const WMO = {
  0:  { label: 'Despejado', icon: '☀️' },  1: { label: 'Mayormente despejado', icon: '🌤️' },
  2:  { label: 'Parcialmente nublado', icon: '⛅' }, 3: { label: 'Nublado', icon: '☁️' },
  45: { label: 'Niebla', icon: '🌫️' }, 51: { label: 'Llovizna', icon: '🌦️' },
  61: { label: 'Lluvia ligera', icon: '🌧️' }, 63: { label: 'Lluvia', icon: '🌧️' },
  71: { label: 'Nevada', icon: '🌨️' }, 80: { label: 'Chaparrones', icon: '🌦️' },
  95: { label: 'Tormenta', icon: '⛈️' },
}
function getWmo(code) { return WMO[code] ?? { label: 'Variable', icon: '🌡️' } }

async function fetchWeather() {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m&timezone=auto&forecast_days=1`)
        const json = await res.json()
        const c = json.current
        let city = ''
        try {
          const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`, { headers: { 'Accept-Language': 'es' } })
          const gj = await geo.json()
          city = gj.address?.city || gj.address?.town || gj.address?.village || ''
        } catch { /**/ }
        resolve({ temp: Math.round(c.temperature_2m), code: c.weathercode, wind: Math.round(c.windspeed_10m), humidity: c.relative_humidity_2m, city })
      } catch { resolve(null) }
    }, () => resolve(null), { timeout: 6000 })
  })
}

function greeting() {
  const h = new Date().getHours()
  if (h >= 6 && h < 13) return 'Buenos días'
  if (h >= 13 && h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

// ─── Gráfico de Ingresos ──────────────────────────────────────────────────────
const PERIODOS = [
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes',    label: 'Este mes'    },
  { key: 'anio',   label: 'Este año'    },
]

function buildDatosSemana(facturas, presupuestos) {
  const now = new Date()
  const lunes = new Date(now)
  lunes.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  lunes.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes)
    d.setDate(lunes.getDate() + i)
    const key = d.toDateString()
    const label = `${DIAS[d.getDay()]} ${d.getDate()}`
    const fac = facturas
      .filter(f => f.estado === 'pagada' && new Date(f.created_at).toDateString() === key)
      .reduce((s, f) => s + (f.total_general || 0), 0)
    const pres = presupuestos
      .filter(p => p.estado === 'aprobado' && new Date(p.created_at).toDateString() === key)
      .reduce((s, p) => s + (p.total_general || 0), 0)
    return { label, facturas: fac, presupuestos: pres }
  })
}

function buildDatosMes(facturas, presupuestos) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const diasEnMes = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: diasEnMes }, (_, i) => {
    const d = new Date(year, month, i + 1)
    const key = d.toDateString()
    const label = String(i + 1)
    const fac = facturas
      .filter(f => f.estado === 'pagada' && new Date(f.created_at).toDateString() === key)
      .reduce((s, f) => s + (f.total_general || 0), 0)
    const pres = presupuestos
      .filter(p => p.estado === 'aprobado' && new Date(p.created_at).toDateString() === key)
      .reduce((s, p) => s + (p.total_general || 0), 0)
    return { label, facturas: fac, presupuestos: pres }
  })
}

function buildDatosAnio(facturas, presupuestos) {
  const year = new Date().getFullYear()
  return Array.from({ length: 12 }, (_, i) => {
    const label = MESES[i]
    const fac = facturas
      .filter(f => {
        const d = new Date(f.created_at)
        return f.estado === 'pagada' && d.getFullYear() === year && d.getMonth() === i
      })
      .reduce((s, f) => s + (f.total_general || 0), 0)
    const pres = presupuestos
      .filter(p => {
        const d = new Date(p.created_at)
        return p.estado === 'aprobado' && d.getFullYear() === year && d.getMonth() === i
      })
      .reduce((s, p) => s + (p.total_general || 0), 0)
    return { label, facturas: fac, presupuestos: pres }
  })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-container border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-2">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
      <p className="text-xs text-outline mt-1 border-t border-white/10 pt-1">
        Total: {fmtMoney(payload.reduce((s, p) => s + p.value, 0))}
      </p>
    </div>
  )
}

function GraficoIngresos({ facturas, presupuestos }) {
  const [periodo, setPeriodo] = useState('mes')

  const datos = periodo === 'semana'
    ? buildDatosSemana(facturas, presupuestos)
    : periodo === 'mes'
    ? buildDatosMes(facturas, presupuestos)
    : buildDatosAnio(facturas, presupuestos)

  const totalFac  = datos.reduce((s, d) => s + d.facturas, 0)
  const totalPres = datos.reduce((s, d) => s + d.presupuestos, 0)

  return (
    <div className="bg-surface-container-lowest border border-white/5 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h3 className="font-headline text-lg font-bold tracking-tight text-on-surface">Ingresos</h3>
          <p className="text-xs text-outline mt-0.5">Facturas pagadas + presupuestos aprobados</p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-container rounded-xl p-1 border border-white/5">
          {PERIODOS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                periodo === p.key
                  ? 'bg-primary text-on-primary-fixed shadow'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Totales rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-container rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Facturas</p>
          <p className="text-xl font-extrabold text-green-400">{fmtMoney(totalFac)}</p>
        </div>
        <div className="bg-surface-container rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Presupuestos</p>
          <p className="text-xl font-extrabold text-primary">{fmtMoney(totalPres)}</p>
        </div>
        <div className="bg-surface-container rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Total</p>
          <p className="text-xl font-extrabold text-on-surface">{fmtMoney(totalFac + totalPres)}</p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={datos} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradFac" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
            </linearGradient>
            <linearGradient id="gradPres" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6750a4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6750a4" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
            tickLine={false}
            axisLine={false}
            interval={periodo === 'mes' ? 4 : 0}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(val) => <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{val}</span>}
          />
          <Area
            type="monotone" dataKey="facturas" name="Facturas"
            stroke="#22c55e" strokeWidth={2}
            fill="url(#gradFac)" dot={false} activeDot={{ r: 4, fill: '#22c55e' }}
          />
          <Area
            type="monotone" dataKey="presupuestos" name="Presupuestos"
            stroke="#6750a4" strokeWidth={2}
            fill="url(#gradPres)" dot={false} activeDot={{ r: 4, fill: '#6750a4' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

function AlertaStock({ repuestos }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/8 overflow-hidden">
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-yellow-500/10 transition-colors"
      >
        <span className="material-symbols-outlined text-yellow-400 text-[20px] shrink-0">
          warning
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-yellow-400">
            {repuestos.length} repuesto{repuestos.length !== 1 ? 's' : ''} sin stock
          </p>
          <p className="text-[11px] text-yellow-400/60 mt-0.5">
            Hacé clic para ver el detalle
          </p>
        </div>
        <span className={`material-symbols-outlined text-yellow-400/60 text-[18px] transition-transform ${expandido ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {expandido && (
        <div className="border-t border-yellow-500/20 divide-y divide-yellow-500/10">
          {repuestos.map(r => (
            <div key={r.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-yellow-500/5">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-yellow-400/50 text-[15px]">
                  settings_input_component
                </span>
                <div>
                  <p className="text-sm font-bold text-on-surface">{r.nombre}</p>
                  {r.codigo && <p className="text-[10px] text-outline font-mono">{r.codigo}</p>}
                </div>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                Sin stock
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Dashboard({ setTopbarAction }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [turnos, setTurnos] = useState([])
  const [allTurnos, setAllTurnos] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(null)
  const [activeFilter, setActiveFilter] = useState(null)
  const [weather, setWeather] = useState(null)
  const [facturas, setFacturas] = useState([])
  const [presupuestos, setPresupuestos] = useState([])
  const [sinStock, setSinStock] = useState([])

  const nombre = user?.user_metadata?.nombre || user?.email?.split('@')[0] || ''
  const now = new Date()
  const fechaLabel = `${DIAS_FULL[now.getDay()]} ${now.getDate()} de ${MESES_FULL[now.getMonth()]} de ${now.getFullYear()}`

  useEffect(() => { setTopbarAction(null) }, [])

  useEffect(() => {
    fetchWeather().then(setWeather)
  }, [])

  useEffect(() => {
    loadData()
  }, [weekOffset])

  async function loadData() {
    setLoading(true)
    const { mon, sun } = weekRange(weekOffset)
    const [{ data: semT }, { data: allT }] = await Promise.all([
      supabase.from('turnos').select('id,fecha_hora,estado,tareas,clientes(nombre,apellido,telefono),vehiculos(patente,marca,modelo)')
        .eq('user_id', user?.id).gte('fecha_hora', mon.toISOString()).lte('fecha_hora', sun.toISOString()).order('fecha_hora'),
      supabase.from('turnos').select('id,fecha_hora,estado,tareas,clientes(nombre,apellido),vehiculos(patente,marca,modelo)')
        .eq('user_id', user?.id).order('fecha_hora', { ascending: false })
    ])
    setTurnos(semT || [])
    setAllTurnos(allT || [])

    // Datos de ingresos: todos los registros del año en curso
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
    const [{ data: facs }, { data: pres }] = await Promise.all([
      supabase.from('v_facturas_totales').select('created_at,estado,total_general')
        .eq('user_id', user?.id).gte('created_at', yearStart),
      supabase.from('v_presupuestos_totales').select('created_at,estado,total_general')
        .eq('user_id', user?.id).gte('created_at', yearStart),
    ])
    setFacturas(facs || [])
    setPresupuestos(pres || [])

    // Repuestos sin stock
    const { data: sinStockData } = await supabase
      .from('repuestos')
      .select('id,nombre,codigo,stock_actual')
      .eq('user_id', user?.id)
      .or('stock_actual.is.null,stock_actual.eq.0')
      .order('nombre')
    setSinStock(sinStockData || [])

    const today = new Date(); today.setHours(0,0,0,0)
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d })
    const todayIdx = days.findIndex(d => d.toDateString() === today.toDateString())
    setSelectedDay(todayIdx !== -1 ? todayIdx : 0)
    setLoading(false)
  }

  const { mon, sun } = weekRange(weekOffset)
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d })
  const today = new Date(); today.setHours(0,0,0,0)

  const conteo = { pendiente: 0, en_proceso: 0, finalizado: 0 }
  allTurnos.forEach(t => { if (conteo[t.estado] !== undefined) conteo[t.estado]++ })
  const { mon: curMon, sun: curSun } = weekRange(0)
  const semanaCount = allTurnos.filter(t => { const d = new Date(t.fecha_hora); return d >= curMon && d <= curSun }).length

  const filterList = activeFilter === 'semana'
    ? allTurnos.filter(t => { const d = new Date(t.fecha_hora); return d >= curMon && d <= curSun })
    : activeFilter ? allTurnos.filter(t => t.estado === activeFilter) : []

  const dayTurnos = selectedDay !== null
    ? turnos.filter(t => new Date(t.fecha_hora).toDateString() === days[selectedDay]?.toDateString())
    : []

  const rangoLabel = `${mon.getDate()} ${MESES[mon.getMonth()]} — ${sun.getDate()} ${MESES[sun.getMonth()]} ${sun.getFullYear()}`

  const STATS = [
    { key: 'pendiente',  label: 'Pendientes',   value: conteo.pendiente,  icon: 'hourglass_top', accent: 'text-yellow-400', bar: 'bg-yellow-400' },
    { key: 'en_proceso', label: 'En Proceso',    value: conteo.en_proceso, icon: 'engineering',   accent: 'text-primary',    bar: 'bg-primary' },
    { key: 'finalizado', label: 'Finalizados',   value: conteo.finalizado, icon: 'task_alt',       accent: 'text-green-400',  bar: 'bg-green-400' },
    { key: 'semana',     label: 'Esta Semana',   value: semanaCount,       icon: 'calendar_month', accent: 'text-tertiary',   bar: 'bg-tertiary' },
  ]

  if (loading) return <Spinner />

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-1">
            {greeting()}, {nombre} 👋
          </h2>
          <p className="text-on-surface-variant text-sm font-medium">{fechaLabel}</p>
        </div>
        {weather && (
          <div className="flex items-center gap-3 bg-surface-container-low border border-white/5 rounded-xl px-4 py-3">
            <span className="text-2xl">{getWmo(weather.code).icon}</span>
            <div>
              <p className="text-lg font-black text-on-surface">{weather.temp}°C</p>
              <p className="text-[10px] text-outline uppercase tracking-wider">
                {getWmo(weather.code).label}{weather.city ? ` · ${weather.city}` : ''} · 💨{weather.wind}km/h
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alerta de stock */}
      {sinStock.length > 0 && (
        <AlertaStock repuestos={sinStock} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveFilter(activeFilter === s.key ? null : s.key)}
            className={`bg-surface-container-low border border-white/5 rounded-xl p-5 flex flex-col gap-3 text-left transition-all hover:border-white/10 relative overflow-hidden group ${activeFilter === s.key ? 'border-primary/30 bg-primary/5' : ''}`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${s.bar}`} />
            <div className="flex justify-between items-start">
              <span className={`text-[10px] font-headline font-bold uppercase tracking-widest text-outline`}>{s.label}</span>
              <span className={`material-symbols-outlined text-[20px] ${s.accent} group-hover:scale-110 transition-transform`}>{s.icon}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold tracking-tight ${s.accent}`}>{s.value}</span>
              <span className="text-xs text-on-surface-variant">turnos</span>
            </div>
          </button>
        ))}
      </div>

      {/* Filter panel */}
      {activeFilter && (
        <div className="bg-surface-container-lowest border border-white/5 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <span className="font-headline font-bold uppercase text-[11px] tracking-widest text-outline">
              {STATS.find(s => s.key === activeFilter)?.label} — {filterList.length} turno{filterList.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => setActiveFilter(null)} className="text-outline hover:text-on-surface">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {filterList.length === 0 ? (
              <div className="px-6 py-8 text-center text-outline text-sm">No hay turnos en esta categoría</div>
            ) : filterList.map(t => (
              <div key={t.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/5">
                <div className="text-right shrink-0 w-24">
                  <p className="text-xs font-bold text-primary">{new Date(t.fecha_hora).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'})}</p>
                  <p className="text-[10px] text-outline">{new Date(t.fecha_hora).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-on-surface">{[t.clientes?.apellido, t.clientes?.nombre].filter(Boolean).join(', ') || '—'}</p>
                  <p className="text-xs text-outline truncate">{t.vehiculos?.patente} · {t.vehiculos?.marca} {t.vehiculos?.modelo}</p>
                  {t.tareas && <p className="text-xs text-on-surface-variant truncate mt-0.5">{t.tareas}</p>}
                </div>
                <Badge estado={t.estado} />
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Weekly Calendar */}
      <div className="bg-surface-container-lowest border border-white/5 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-headline text-lg font-bold tracking-tight text-on-surface">Calendario Semanal</h3>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-wider font-headline whitespace-nowrap">
              {rangoLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)} className="px-3 py-1.5 text-xs font-bold text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high border border-white/5 rounded-lg transition-all">
              ‹ Anterior
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-lg">
                Hoy
              </button>
            )}
            <button onClick={() => setWeekOffset(w => w + 1)} className="px-3 py-1.5 text-xs font-bold text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high border border-white/5 rounded-lg transition-all">
              Siguiente ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 md:grid-cols-7 md:gap-3">
          {days.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString()
            const count = turnos.filter(t => new Date(t.fecha_hora).toDateString() === d.toDateString()).length
            const isSelected = selectedDay === i
            const isWeekend = d.getDay() === 0 || d.getDay() === 6

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : isToday
                    ? 'bg-primary/5 border-primary/15 text-primary'
                    : 'border-white/5 hover:border-white/10 hover:bg-white/5 ' + (isWeekend ? 'opacity-40' : 'text-on-surface')
                }`}
              >
                <p className="text-[10px] font-headline font-bold uppercase tracking-wider text-current opacity-70">{DIAS[d.getDay()]}</p>
                <p className="text-xl font-extrabold mt-1">{d.getDate()}</p>
                {count > 0 ? (
                  <div className="mt-1.5 bg-primary/20 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    {count}
                  </div>
                ) : (
                  <div className="mt-1.5 h-4" />
                )}
              </button>
            )
          })}
        </div>

        {/* Turnos del día seleccionado */}
        {selectedDay !== null && (
          <div className="mt-6 border-t border-white/5 pt-6">
            <h4 className="text-[11px] font-headline font-bold uppercase tracking-widest text-outline mb-4">
              {DIAS[days[selectedDay]?.getDay()]} {days[selectedDay]?.getDate()} de {MESES[days[selectedDay]?.getMonth()]} — Turnos pendientes
            </h4>
            {dayTurnos.filter(t => t.estado === 'pendiente').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-white/5 rounded-xl opacity-40">
                <span className="material-symbols-outlined text-3xl text-outline mb-2">event_available</span>
                <p className="text-xs font-bold text-on-surface uppercase tracking-tight">Sin turnos pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayTurnos.filter(t => t.estado === 'pendiente').map(t => (
                  <div key={t.id} className="bg-surface-container border border-white/5 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-container-low rounded-xl flex items-center justify-center shrink-0 border border-white/5">
                      <span className="material-symbols-outlined text-primary">minor_crash</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface">{[t.clientes?.apellido, t.clientes?.nombre].filter(Boolean).join(', ') || '—'}</p>
                      <p className="text-xs text-outline">{t.vehiculos?.patente} · {t.vehiculos?.marca} {t.vehiculos?.modelo}</p>
                      {t.tareas && <p className="text-xs text-on-surface-variant truncate mt-0.5">{t.tareas}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-primary">
                        {new Date(t.fecha_hora).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}
                      </p>
                      {t.clientes?.telefono && (
                        <a href={`tel:${t.clientes.telefono}`} className="text-[10px] text-outline hover:text-primary">{t.clientes.telefono}</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gráfico de Ingresos */}
      <GraficoIngresos facturas={facturas} presupuestos={presupuestos} />
    </div>
  )
}
