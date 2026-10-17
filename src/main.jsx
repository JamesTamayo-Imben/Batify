import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import './styles/tokens.css'
import './styles/envelope.css'
import './styles/giftbox.css'
import './styles/bits.css'

import NavShell from './components/NavShell'
import Home from './pages/Home'
import Create from './pages/Create'
import PublicPage from './pages/PublicPage'
import EditEntry from './pages/EditEntry'
import EditPage from './pages/EditPage'
import NotFound from './pages/NotFound'

const Admin = lazy(() => import('./pages/Admin'))

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The letter is immersive: no site chrome around it. */}
        <Route path="/p/:slug" element={<PublicPage />} />
        <Route element={<NavShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<Create />} />
          <Route path="/edit" element={<EditEntry />} />
          <Route path="/edit/:token" element={<EditPage />} />
          <Route
            path="/admin"
            element={
              <Suspense fallback={<p className="p-8 text-center text-muted">Loading</p>}>
                <Admin />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker: production only (autoUpdate via vite-plugin-pwa)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}
