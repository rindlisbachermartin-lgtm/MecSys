import { useEffect } from 'react'

export function Modal({ title, children, onClose, width = 'max-w-2xl', noPadding = false }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className={`relative w-full ${width} bg-surface-container rounded-2xl border border-white/5 shadow-2xl flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <h2 className="font-headline text-base font-bold text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:text-on-surface hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {/* Body */}
        <div className={`overflow-y-auto flex-1 ${noPadding ? '' : 'p-6'}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
