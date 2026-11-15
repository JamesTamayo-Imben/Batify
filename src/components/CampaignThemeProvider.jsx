import { createContext, useContext, useEffect, useState } from 'react'
import { CAMPAIGN_COLUMNS, millisecondsUntilManilaMidnight, occasionOf, priorityThemeFor } from '../lib/campaigns'
import { sb } from '../lib/supabase'
import Snowfall from './Snowfall'

const CampaignThemeContext = createContext({
  themeId: null,
  previewThemeId: null,
  setPreviewThemeId: () => {},
  loading: true,
})

export function useCampaignTheme() {
  return useContext(CampaignThemeContext)
}

export default function CampaignThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(null)
  const [previewThemeId, setPreviewThemeId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let timer
    let campaigns = null

    const updateTheme = () => {
      if (!active || !campaigns) return
      clearTimeout(timer)
      setThemeId(priorityThemeFor(campaigns))
      timer = setTimeout(updateTheme, millisecondsUntilManilaMidnight())
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') updateTheme()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    sb.from('campaign_events').select(CAMPAIGN_COLUMNS).eq('is_enabled', true)
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('Could not load priority campaign themes:', error)
          setLoading(false)
          return
        }
        campaigns = data || []
        setLoading(false)
        updateTheme()
      })
      .catch((error) => {
        if (!active) return
        console.error('Could not load priority campaign themes:', error)
        setLoading(false)
      })

    return () => {
      active = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const activeThemeId = previewThemeId || themeId
  const previewLabel = occasionOf(previewThemeId)?.label || previewThemeId
  return (
    <CampaignThemeContext.Provider value={{ themeId: activeThemeId, previewThemeId, setPreviewThemeId, loading }}>
      <div data-theme={activeThemeId || 'confetti'} className="min-h-dvh bg-paper">
        {previewThemeId && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-sun px-4 py-2 text-sm font-semibold text-ink">
            <p role="status">Previewing {previewLabel} theme on this device.</p>
            <button
              type="button"
              className="btn-ghost btn-sm shrink-0"
              aria-label={`Turn off ${previewLabel} theme preview`}
              onClick={() => setPreviewThemeId(null)}
            >
              Turn off preview
            </button>
          </div>
        )}
        {activeThemeId === 'christmas' && <Snowfall />}
        {children}
      </div>
    </CampaignThemeContext.Provider>
  )
}
