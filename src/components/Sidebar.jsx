import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Modal } from './Modal'
import { InlineSpinner } from './Spinner'

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',    icon: 'dashboard',                  section: null },
  { id: 'turnos',       label: 'Turnos',        icon: 'calendar_month',             section: 'Operaciones' },
  { id: 'checklists',   label: 'Checklists',    icon: 'checklist',                  section: null },
  { id: 'presupuestos', label: 'Presupuestos',  icon: 'request_quote',              section: 'Finanzas' },
  { id: 'facturas',     label: 'Facturación',   icon: 'receipt',                    section: null },
  { id: 'caja',         label: 'Caja Diaria',   icon: 'point_of_sale',              section: null },
  { id: 'deudas',       label: 'Deudas',        icon: 'account_balance_wallet',     section: null },
  { id: 'gastos',       label: 'Gastos',        icon: 'payments',                   section: null },
  { id: 'clientes',     label: 'Clientes',      icon: 'group',                      section: 'Registros' },
  { id: 'repuestos',    label: 'Repuestos',     icon: 'settings_input_component',   section: null },
]

export function Sidebar({ currentPage, onNavigate, open, onToggle }) {
  const { user, signOut } = useAuth()
  const [showAbout, setShowAbout] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const nombre = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Usuario'

  return (
    <aside className={`h-screen w-64 flex flex-col fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant/20 z-50 py-6 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo */}
      <button
        onClick={() => setShowAbout(true)}
        className="px-5 mb-8 flex items-center gap-3 hover:opacity-75 transition-opacity active:scale-[0.98] w-full text-left"
      >
        <div className="w-9 h-9 bg-primary/20 flex items-center justify-center rounded-xl border border-primary/30 shrink-0">
          <span className="material-symbols-outlined text-primary text-[20px]">engineering</span>
        </div>
        <div>
          <h1 className="font-headline text-base font-black tracking-tighter text-on-surface leading-tight">MecSys</h1>
          <p className="font-headline tracking-tight font-bold uppercase text-[10px] text-primary">Gestión de Taller</p>
        </div>
      </button>

      <nav className="flex-grow space-y-0.5 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item, idx) => {
          const active = currentPage === item.id
          const showSection = item.section !== null && item.section !== undefined
          return (
            <div key={item.id}>
              {showSection && (
                <p className="px-4 pt-4 pb-1 text-[9px] font-headline font-bold uppercase tracking-[0.15em] text-outline/50">
                  {item.section}
                </p>
              )}
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full px-4 py-3 flex items-center gap-3 transition-all text-left ${
                  active
                    ? 'bg-primary/10 text-primary border-l-4 border-primary font-semibold scale-[0.98]'
                    : 'text-on-surface-variant hover:bg-surface-container-low border-l-4 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-headline tracking-tight font-bold uppercase text-[11px]">{item.label}</span>
              </button>
            </div>
          )
        })}
      </nav>

      {/* Bottom — usuario + editar perfil */}
      <div className="px-2 mt-auto space-y-0.5">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[16px]">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">{nombre}</p>
            <p className="text-[10px] text-outline truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => setShowProfile(true)}
            title="Editar perfil"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-outline hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
          </button>
        </div>
        <button
          onClick={signOut}
          className="w-full text-on-surface-variant hover:bg-surface-container-low px-4 py-3 flex items-center gap-3 transition-all border-l-4 border-transparent"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span className="font-headline tracking-tight font-bold uppercase text-[11px]">Cerrar sesión</span>
        </button>
      </div>

      {/* Modal — Acerca de */}
      {showAbout && (
        <Modal title="Acerca de MecSys" onClose={() => setShowAbout(false)} width="max-w-sm">
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="w-16 h-16 bg-primary/20 flex items-center justify-center rounded-2xl border border-primary/30">
              <span className="material-symbols-outlined text-primary text-3xl">engineering</span>
            </div>
            <div>
              <h2 className="font-headline text-xl font-black tracking-tighter text-on-surface mb-2">MecSys</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Sistema para gestión de talleres mecánicos.
              </p>
              <p className="text-xs text-outline mt-4 font-medium">
                Todos los derechos reservados © 2026
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal — Editar perfil */}
      {showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} />
      )}
    </aside>
  )
}

function ProfileModal({ user, onClose }) {
  const [nombre, setNombre] = useState(user?.user_metadata?.nombre || '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.auth.updateUser({ data: { nombre: nombre.trim() } })
    setSaving(false)
    onClose()
  }

  const inputCls = 'w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20'
  const labelCls = 'block text-[11px] font-headline font-bold uppercase tracking-wider text-outline mb-1.5'

  return (
    <Modal title="Editar perfil" onClose={onClose} width="max-w-sm">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className={labelCls}>Nombre del taller</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            className={inputCls}
            placeholder="Mi Taller Mecánico"
          />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" value={user?.email || ''} disabled className={inputCls + ' opacity-50 cursor-not-allowed'} />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/20">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low rounded-xl">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dim text-on-primary-fixed font-bold text-sm rounded-xl flex items-center gap-2 disabled:opacity-60">
            {saving && <InlineSpinner />} Guardar
          </button>
        </div>
      </form>
    </Modal>
  )
}
