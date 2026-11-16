import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import './styles/tokens.css'
import './styles/envelope.css'
import './styles/giftbox.css'
import './styles/bits.css'
import './styles/seasonal.css'

import NavShell from './components/NavShell'
import CampaignThemeProvider from './components/CampaignThemeProvider'
const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const AboutDeveloper = lazy(() => import('./pages/AboutDeveloper'))
const Contact = lazy(() => import('./pages/Contact'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))
const FAQ = lazy(() => import('./pages/FAQ'))
const Create = lazy(() => import('./pages/Create'))
const PublicPage = lazy(() => import('./pages/PublicPage'))
const EditEntry = lazy(() => import('./pages/EditEntry'))
const EditPage = lazy(() => import('./pages/EditPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Admin = lazy(() => import('./pages/Admin'))
const History = lazy(() => import('./pages/History'))

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<p className="page-wrap text-center text-muted">Loading page…</p>}>
        <Routes>
          {/* The letter is immersive: no site chrome around it. */}
          <Route path="/p/:slug" element={<PublicPage />} />
          <Route element={<NavShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/about-developer" element={<AboutDeveloper />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/create" element={<Create />} />
            <Route path="/edit" element={<EditEntry />} />
            <Route path="/edit/:token" element={<EditPage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/history" element={<History />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CampaignThemeProvider>
      <App />
    </CampaignThemeProvider>
  </StrictMode>,
)

// Service worker: production only (autoUpdate via vite-plugin-pwa)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
}
