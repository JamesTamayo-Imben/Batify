import { createContext, useContext, useEffect, useRef, useState } from 'react'
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

function ChristmasAudio() {
  const audio = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const track = new Audio('/audio/christmas-story.mp3')
    track.volume = 0.12
    track.preload = 'none'
    audio.current = track
    const onEnded = () => setPlaying(false)
    track.addEventListener('ended', onEnded)
    track.play().then(() => setPlaying(true)).catch(() => {})
    return () => {
      track.pause()
      track.removeEventListener('ended', onEnded)
      audio.current = null
    }
  }, [])

  async function toggleAudio() {
    const track = audio.current
    if (!track) return
    setError('')
    if (!track.paused) {
      track.pause()
      setPlaying(false)
      return
    }
    try {
      await track.play()
      setPlaying(true)
    } catch (playError) {
      console.error('Could not play the Christmas audio:', playError)
      setError('Audio could not be played. Check your browser settings and try again.')
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-ground px-4 py-2 text-sm font-semibold text-ink">
      <p>Quiet Christmas music</p>
      <button type="button" className="btn-ghost btn-sm shrink-0" onClick={toggleAudio} aria-pressed={playing}>
        {playing ? 'Pause Christmas music' : 'Play Christmas music'}
      </button>
      {error && <p role="alert" className="w-full">{error}</p>}
    </div>
  )
}

export default function CampaignThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(null)
  const [previewThemeId, setPreviewThemeId] = useState(null)
  const [systemThemeDisabled, setSystemThemeDisabled] = useState(() => {
    try {
      return localStorage.getItem('batify:disable-seasonal-theme') === 'true'
    } catch (error) {
      console.warn('Could not read the local seasonal theme preference:', error)
      return false
    }
  })
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

  const activeThemeId = previewThemeId || (systemThemeDisabled ? null : themeId)
  const previewLabel = occasionOf(previewThemeId)?.label || previewThemeId
  const systemThemeLabel = occasionOf(themeId)?.label || themeId
  function toggleSystemTheme() {
    const disabled = !systemThemeDisabled
    try {
      localStorage.setItem('batify:disable-seasonal-theme', String(disabled))
      setSystemThemeDisabled(disabled)
    } catch (error) {
      console.error('Could not save the local seasonal theme preference:', error)
    }
  }

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
        {!previewThemeId && themeId && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-sun px-4 py-2 text-sm font-semibold text-ink">
            <p role="status">{systemThemeDisabled
              ? `Seasonal themes are off on this device. ${systemThemeLabel} is active today.`
              : `${systemThemeLabel} theme is active today.`}</p>
            <button type="button" className="btn-ghost btn-sm shrink-0" onClick={toggleSystemTheme}>
              {systemThemeDisabled ? 'Turn on seasonal theme' : 'Turn off on this device'}
            </button>
          </div>
        )}
        {activeThemeId === 'christmas' && <Snowfall />}
        {activeThemeId === 'christmas' && <ChristmasAudio />}
        {children}
      </div>
    </CampaignThemeContext.Provider>
  )
}
