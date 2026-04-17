import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { InlineSpinner } from '../components/Spinner'

function tradError(msg) {
  if (msg?.includes('Invalid login')) return 'Email o contraseña incorrectos.'
  if (msg?.includes('already registered')) return 'Ese email ya está registrado.'
  if (msg?.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.'
  return msg
}

export function Auth() {
  const { signIn, signUp } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [regForm, setRegForm] = useState({ nombre: '', email: '', password: '' })

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(loginForm.email, loginForm.password)
    } catch (err) {
      setError(tradError(err.message))
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await signUp(regForm.email, regForm.password, regForm.nombre)
      if (!data.session) {
        showToast('Revisá tu email para confirmar la cuenta', 'info')
        setTab('login')
      }
    } catch (err) {
      setError(tradError(err.message))
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder-outline focus:outline-none focus:ring-2 focus:ring-primary/20'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">engineering</span>
          </div>
          <h1 className="font-headline text-3xl font-black tracking-tighter text-on-surface">MecSys</h1>
          <p className="font-headline text-[11px] font-bold uppercase tracking-widest text-primary mt-1">Gestión de Taller</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-4 text-xs font-headline font-bold uppercase tracking-widest transition-colors ${
                  tab === t
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <div className="p-8">
            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-2">Email</label>
                  <input type="email" required className={inputCls} placeholder="tu@email.com"
                    value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-2">Contraseña</label>
                  <input type="password" required className={inputCls} placeholder="••••••••"
                    value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                {error && <p className="text-error text-sm font-medium">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dim text-on-primary-fixed py-3 rounded-xl font-headline font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <InlineSpinner /> : null}
                  Entrar
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-2">Nombre del taller</label>
                  <input type="text" required className={inputCls} placeholder="Mi Taller"
                    value={regForm.nombre} onChange={e => setRegForm(f => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-2">Email</label>
                  <input type="email" required className={inputCls} placeholder="tu@email.com"
                    value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-2">Contraseña</label>
                  <input type="password" required minLength={6} className={inputCls} placeholder="Mínimo 6 caracteres"
                    value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                {error && <p className="text-error text-sm font-medium">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dim text-on-primary-fixed py-3 rounded-xl font-headline font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading ? <InlineSpinner /> : null}
                  Crear cuenta
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
