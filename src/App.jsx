import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Turnos } from './pages/Turnos'
import { Presupuestos } from './pages/Presupuestos'
import { Facturas } from './pages/Facturas'
import { Clientes } from './pages/Clientes'
import { Repuestos } from './pages/Repuestos'
import { Checklists } from './pages/Checklists'
import { Caja } from './pages/Caja'
import { Deudas } from './pages/Deudas'
import { Gastos } from './pages/Gastos'
import { Spinner } from './components/Spinner'

const PAGES = {
  dashboard:    Dashboard,
  turnos:       Turnos,
  checklists:   Checklists,
  presupuestos: Presupuestos,
  facturas:     Facturas,
  caja:         Caja,
  deudas:       Deudas,
  gastos:       Gastos,
  clientes:     Clientes,
  repuestos:    Repuestos,
}

function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}

function useAutoCapitalize() {
  useEffect(() => {
    function capFirst(e) {
      const el = e.target
      if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return
      const type = el.type || 'text'
      if (!['text', 'search', 'tel', 'url', ''].includes(type)) return
      const v = el.value
      if (!v || v[0] === v[0].toUpperCase()) return
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v[0].toUpperCase() + v.slice(1))
    }
    document.addEventListener('input', capFirst, true)
    return () => document.removeEventListener('input', capFirst, true)
  }, [])
}

function AppShell() {
  useAutoCapitalize()
  const { dark, toggle: toggleTheme } = useTheme()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const toggleSidebar = () => setSidebarOpen(v => !v)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [topbarAction, setTopbarAction] = useState(null)

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) return <Auth />

  const PageComponent = PAGES[currentPage] || Dashboard

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        currentPage={currentPage}
        open={sidebarOpen}
        onToggle={toggleSidebar}
        onNavigate={page => { setCurrentPage(page); setSearchQuery(''); setTopbarAction(null); if (window.innerWidth < 768) setSidebarOpen(false) }}
      />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Topbar
        currentPage={currentPage}
        onSearch={setSearchQuery}
        action={topbarAction}
        dark={dark}
        onToggleTheme={toggleTheme}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
      />
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ml-0 ${sidebarOpen ? 'md:ml-64' : ''}`}
      >
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <PageComponent
            searchQuery={searchQuery}
            setTopbarAction={setTopbarAction}
          />
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AuthProvider>
  )
}
