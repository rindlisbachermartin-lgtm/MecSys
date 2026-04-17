import { useEffect, useState } from 'react'

const STEPS = ['Iniciando sistema…', 'Cargando datos…', 'Listo']

export function SplashScreen({ onDone }) {
  const [progress, setProgress] = useState(0)
  const [stepIdx, setStepIdx]   = useState(0)
  const [leaving, setLeaving]   = useState(false)

  useEffect(() => {
    // Progresa de 0 → 100 en ~1.6 s con aceleración
    const start = performance.now()
    const duration = 1600

    function tick(now) {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setProgress(Math.round(eased * 100))
      setStepIdx(eased < 0.45 ? 0 : eased < 0.85 ? 1 : 2)
      if (t < 1) requestAnimationFrame(tick)
      else {
        // pequeña pausa en 100 % y luego fade out
        setTimeout(() => {
          setLeaving(true)
          setTimeout(onDone, 600)
        }, 300)
      }
    }
    requestAnimationFrame(tick)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Glow ambiental */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      {/* Logo */}
      <div
        className="relative flex flex-col items-center"
        style={{
          animation: 'splashLogoIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Ícono */}
        <div className="relative w-24 h-24 mb-6">
          {/* Anillo exterior girando */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20"
            style={{ animation: 'splashRing 2s linear infinite' }} />
          {/* Arco de progreso */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(var(--c-primary)/0.12)"  strokeWidth="4" />
            <circle cx="48" cy="48" r="44" fill="none"
              stroke="rgb(var(--c-primary))" strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.1s linear' }}
            />
          </svg>
          {/* Centro */}
          <div className="absolute inset-2 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-primary text-4xl">engineering</span>
          </div>
        </div>

        {/* Nombre */}
        <h1 className="font-headline text-4xl font-black tracking-tighter text-on-surface mb-1">
          Mec<span className="text-primary">Sys</span>
        </h1>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-outline mb-10">
          Gestión de Taller
        </p>

        {/* Barra de progreso */}
        <div className="w-56 h-1 bg-surface-container rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-primary rounded-full"
            style={{
              width: `${progress}%`,
              transition: 'width 0.1s linear',
              boxShadow: '0 0 12px rgb(var(--c-primary)/0.6)',
            }}
          />
        </div>

        {/* Texto de paso */}
        <p
          key={stepIdx}
          className="text-[11px] font-medium text-outline"
          style={{ animation: 'splashFadeUp 0.3s ease both' }}
        >
          {STEPS[stepIdx]}
        </p>

        {/* Porcentaje */}
        <p className="text-[10px] font-mono text-outline/50 mt-1">{progress}%</p>
      </div>

      <style>{`
        @keyframes splashLogoIn {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);     }
        }
        @keyframes splashFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes splashRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
