import { createContext, useContext, useEffect, useState } from 'react'
import { CAMPAIGN_COLUMNS, millisecondsUntilManilaMidnight, priorityThemeFor } from '../lib/campaigns'
import { sb } from '../lib/supabase'

const CampaignThemeContext = createContext({ themeId: null, loading: true })

export function useCampaignTheme() {
  return useContext(CampaignThemeContext)
}

export default function CampaignThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(null)
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

  return (
    <CampaignThemeContext.Provider value={{ themeId, loading }}>
      <div data-theme={themeId || 'confetti'} className="min-h-dvh bg-paper">
        {themeId === 'christmas' && <div className="seasonal-snow" aria-hidden="true" />}
        {children}
      </div>
    </CampaignThemeContext.Provider>
  )
}
