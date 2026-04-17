import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

const ICONS = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
}

const COLORS = {
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
  error: 'border-error/30 bg-error/10 text-error',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  info: 'border-primary/30 bg-primary/10 text-primary',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl backdrop-blur-sm animate-in slide-in-from-right-4 ${COLORS[t.type] || COLORS.info}`}
          >
            <span className="material-symbols-outlined text-[18px]">{ICONS[t.type] || 'info'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
