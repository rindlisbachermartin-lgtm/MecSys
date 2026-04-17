import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { PortalCliente } from './pages/PortalCliente.jsx'
import { SplashScreen } from './components/SplashScreen.jsx'
import './index.css'

const params = new URLSearchParams(window.location.search)
const portalToken = params.get('portal')

function Root() {
  const [splashDone, setSplashDone] = useState(false)

  if (portalToken) return <PortalCliente token={portalToken} />

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <div className={splashDone ? '' : 'invisible'}>
        <App />
      </div>
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
