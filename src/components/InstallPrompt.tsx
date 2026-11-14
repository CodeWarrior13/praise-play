import { useEffect, useState } from 'react'
import { installMode, onInstallChange, promptInstall } from '../lib/install'
import { loadSetting, saveSetting } from '../lib/storage'

const SNOOZE_DAYS = 5

/**
 * A bottom sheet inviting players to install the app. Appears a few seconds after
 * the home screen loads, never mid-game, and stays away for a few days if dismissed.
 * `forceOpen` shows it on demand (the "Get the app" button).
 */
export function InstallPrompt({ themeId, onHome, forceOpen, onClose }: { themeId: string; onHome: boolean; forceOpen: boolean; onClose: () => void }) {
  const [mode, setMode] = useState(installMode)
  const [auto, setAuto] = useState(false)

  useEffect(() => onInstallChange(() => setMode(installMode())), [])

  useEffect(() => {
    if (!onHome || !mode) return
    const snoozedUntil = loadSetting('installSnooze', 0)
    if (Date.now() < snoozedUntil) return
    const timer = window.setTimeout(() => setAuto(true), 4000)
    return () => window.clearTimeout(timer)
  }, [onHome, mode])

  const open = (forceOpen || (auto && onHome)) && mode !== null
  if (!open) return null

  function dismiss() {
    saveSetting('installSnooze', Date.now() + SNOOZE_DAYS * 86_400_000)
    setAuto(false)
    onClose()
  }

  async function install() {
    const accepted = await promptInstall()
    if (accepted) { setAuto(false); onClose() }
  }

  return (
    <div className="install-sheet" role="dialog" aria-label="Install Praise Play">
      <img className="install-icon" src={`${import.meta.env.BASE_URL}icons/${themeId}-192.png`} alt="" width={64} height={64} />
      <div className="install-text">
        <strong>Get the Praise Play app</strong>
        {mode === 'prompt' ? (
          <span>Full-screen play, faster loading, and one tap from your home screen.</span>
        ) : (
          <span>
            Tap <svg viewBox="0 0 24 24" width="16" height="16" aria-label="Share"><path fill="currentColor" d="M12 3 7.5 7.5l1.4 1.4L11 6.8V15h2V6.8l2.1 2.1 1.4-1.4L12 3ZM5 11v9h14v-9h-3v2h1v5H7v-5h1v-2H5Z" /></svg> <b>Share</b>, then <b>Add to Home Screen</b>.
          </span>
        )}
      </div>
      <div className="install-actions">
        {mode === 'prompt' && <button className="primary" onClick={install}>Install</button>}
        <button className="text-button" onClick={dismiss}>{mode === 'prompt' ? 'Not now' : 'Got it'}</button>
      </div>
    </div>
  )
}
