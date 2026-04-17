import { useState } from 'react'

const PAGE_TITLES = {
  dashboard:    'Dashboard',
  turnos:       'Turnos',
  presupuestos: 'Presupuestos',
  facturas:     'Facturación',
  clientes:     'Clientes',
  repuestos:    'Repuestos',
  checklists:   'Checklists',
  caja:         'Caja Diaria',
  deudas:       'Deudas',
  gastos:       'Gastos',
}

export function Topbar({ currentPage, onSearch, action, dark, onToggleTheme, sidebarOpen, onToggleSidebar }) {
  const [query, setQuery] = useState('')
  const [spinning, setSpinning] = useState(false)

  function handleSearch(e) {
    setQuery(e.target.value)
    onSearch?.(e.target.value)
  }

  function handleThemeToggle() {
    setSpinning(true)
    setTimeout(() => setSpinning(false), 400)
    onToggleTheme?.()
  }

  return (
    <header
      className={`fixed top-0 right-0 h-16 z-40 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 border-b border-outline-variant/20 transition-all duration-300 left-0 ${sidebarOpen ? 'md:left-64' : ''}`}
    >
      {/* Botón hamburguesa */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
        className={`w-9 h-9 items-center justify-center rounded-xl text-outline hover:text-primary hover:bg-surface-container transition-colors shrink-0 ${sidebarOpen ? 'hidden md:flex' : 'flex'}`}
      >
        <span className="material-symbols-outlined text-[22px]">
          {sidebarOpen ? 'menu_open' : 'menu'}
        </span>
      </button>

      {/* Logo centrado — solo mobile */}
      <div className={`absolute left-1/2 -translate-x-1/2 items-center gap-2 md:hidden ${sidebarOpen ? 'hidden' : 'flex'}`}>
        <div className="w-7 h-7 bg-primary/20 flex items-center justify-center rounded-lg border border-primary/30 shrink-0">
          <span className="material-symbols-outlined text-primary text-[16px]">engineering</span>
        </div>
        <span className="font-headline text-base font-black tracking-tighter text-on-surface">
          Mec<span className="text-primary">Sys</span>
        </span>
      </div>

      {/* Buscador — solo en desktop */}
      <div className="hidden md:flex items-center flex-grow max-w-xl">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            value={query}
            onChange={handleSearch}
            className="w-full bg-surface-container border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none placeholder-outline text-on-surface"
            placeholder={`Buscar en ${PAGE_TITLES[currentPage] || ''}…`}
            type="text"
          />
        </div>
      </div>

      <div className={`items-center gap-3 ml-4 ${sidebarOpen ? 'hidden md:flex' : 'flex'}`}>
        {/* Theme toggle */}
        <button
          onClick={handleThemeToggle}
          title={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          className={`w-9 h-9 flex items-center justify-center rounded-xl text-outline hover:text-primary hover:bg-surface-container transition-colors`}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{
              display: 'inline-block',
              transform: spinning ? 'rotate(180deg) scale(0.8)' : 'rotate(0deg) scale(1)',
              transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {dark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Page action slot */}
        {action}
      </div>
    </header>
  )
}
