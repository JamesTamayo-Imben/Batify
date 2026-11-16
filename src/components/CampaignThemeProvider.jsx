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

function ThemeMusicControls({
  preview,
  previewLabel,
  systemThemeLabel,
  systemThemeDisabled,
  showChristmasControls,
  musicPlaying,
  onToggleTheme,
  onToggleMusic,
}) {
  const themeName = preview ? previewLabel : systemThemeLabel
  const themeOff = preview || systemThemeDisabled
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn-ghost btn-sm shrink-0"
        aria-label={preview ? `Turn off ${themeName} theme preview` : `${themeOff ? 'Turn on' : 'Turn off'} ${themeName} theme`}
        onClick={onToggleTheme}
      >
        {preview ? 'Turn off preview' : `${themeOff ? 'Turn on' : 'Turn off'} ${themeName} theme`}
      </button>
      {showChristmasControls && (
        <button
          type="button"
          className="btn-ghost btn-sm shrink-0"
          aria-label={`${musicPlaying ? 'Turn off' : 'Turn on'} Christmas music`}
          aria-pressed={musicPlaying}
          onClick={onToggleMusic}
        >
          {musicPlaying ? 'Turn music off' : 'Turn music on'}
        </button>
      )}
    </div>
  )
}

export default function CampaignThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(null)
  const [previewThemeId, setPreviewThemeId] = useState(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const musicEnabledRef = useRef(null)
  if (musicEnabledRef.current === null) {
    try {
      musicEnabledRef.current = localStorage.getItem('batify:christmas-music-enabled') !== 'false'
    } catch (error) {
      console.warn('Could not read the local Christmas music preference:', error)
      musicEnabledRef.current = true
    }
  }
  const [musicError, setMusicError] = useState('')
  const audioRef = useRef(null)
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
  const showChristmasControls = previewThemeId === 'christmas' ||
    (!previewThemeId && themeId === 'christmas')
  useEffect(() => {
    if (!showChristmasControls) {
      audioRef.current?.pause()
      audioRef.current = null
      setMusicPlaying(false)
      return undefined
    }

    const track = new Audio('/audio/christmas-story.mp3')
    track.volume = 0.12
    track.loop = true
    track.preload = 'none'
    audioRef.current = track
    let active = true
    if (musicEnabledRef.current) {
      track.play().then(() => {
        if (active) setMusicPlaying(true)
      }).catch(() => {})
    }
    return () => {
      active = false
      track.pause()
      if (audioRef.current === track) audioRef.current = null
      setMusicPlaying(false)
    }
  }, [showChristmasControls])

  function updateMusicEnabled(enabled) {
    musicEnabledRef.current = enabled
    try {
      localStorage.setItem('batify:christmas-music-enabled', String(enabled))
    } catch (error) {
      console.error('Could not save the local Christmas music preference:', error)
    }
  }

  async function toggleMusic() {
    const track = audioRef.current
    if (!track) return
    setMusicError('')
    if (!track.paused) {
      track.pause()
      setMusicPlaying(false)
      updateMusicEnabled(false)
      return
    }
    try {
      await track.play()
      setMusicPlaying(true)
      updateMusicEnabled(true)
    } catch (error) {
      console.error('Could not play the Christmas audio:', error)
      setMusicError('Music could not be played. Check your browser settings and try again.')
    }
  }

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
            <ThemeMusicControls
              preview
              previewLabel={previewLabel}
              systemThemeLabel={systemThemeLabel}
              systemThemeDisabled={systemThemeDisabled}
              showChristmasControls={showChristmasControls}
              musicPlaying={musicPlaying}
              onToggleTheme={() => setPreviewThemeId(null)}
              onToggleMusic={toggleMusic}
            />
          </div>
        )}
        {!previewThemeId && themeId && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink bg-sun px-4 py-2 text-sm font-semibold text-ink">
            <p role="status">{systemThemeDisabled
              ? `Seasonal themes are off on this device. ${systemThemeLabel} is active today.`
              : `${systemThemeLabel} theme is active today.`}</p>
            <ThemeMusicControls
              preview={false}
              previewLabel={previewLabel}
              systemThemeLabel={systemThemeLabel}
              systemThemeDisabled={systemThemeDisabled}
              showChristmasControls={showChristmasControls}
              musicPlaying={musicPlaying}
              onToggleTheme={toggleSystemTheme}
              onToggleMusic={toggleMusic}
            />
          </div>
        )}
        {activeThemeId === 'christmas' && <Snowfall />}
        {children}
        {musicError && showChristmasControls && (
          <p role="alert" className="border-t border-ink/15 bg-ground px-4 py-2 text-sm font-semibold text-flag">{musicError}</p>
        )}
      </div>
    </CampaignThemeContext.Provider>
  )
}
