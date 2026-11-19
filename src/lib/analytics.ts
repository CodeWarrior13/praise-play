/**
 * Anonymous play stats for the owner's dashboard: a ping when the game opens,
 * the minutes it's actually on screen, and each finished game. The server adds
 * the rough country/city; nothing identifies the player. Off on localhost and
 * on devices that opened the dashboard (so the owner's own play isn't counted).
 */
import { localDateKey } from './daily'

const OFF_KEY = 'praise-play:no-stats'
const LAST_KEY = 'praise-play:last-visit-day'

function enabled(): boolean {
  if (/^(localhost|127\.|\[::1\])/.test(location.hostname)) return false
  try { return localStorage.getItem(OFF_KEY) !== '1' } catch { return true }
}

function send(body: object, beacon = false) {
  const payload = JSON.stringify({ ...body, day: localDateKey() })
  try {
    if (beacon && navigator.sendBeacon) navigator.sendBeacon('/api/visit', new Blob([payload], { type: 'application/json' }))
    else fetch('/api/visit', { method: 'POST', body: payload, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {})
  } catch {
    // Best effort.
  }
}

export function excludeThisDevice(off = true) {
  try { if (off) localStorage.setItem(OFF_KEY, '1'); else localStorage.removeItem(OFF_KEY) } catch { /* ignore */ }
}

let started = false
export function startAnalytics() {
  if (started || !enabled()) return
  started = true
  const today = localDateKey()
  let last: string | null = null
  try { last = localStorage.getItem(LAST_KEY); localStorage.setItem(LAST_KEY, today) } catch { /* ignore */ }
  send({ type: 'start', firstToday: last !== today, returning: last !== null && last !== today })

  // Count only time the game is actually on screen, reported about once a minute.
  let visibleSince = document.visibilityState === 'visible' ? Date.now() : null
  let pending = 0
  const flush = (beacon = false) => {
    if (visibleSince !== null) { pending += (Date.now() - visibleSince) / 1000; visibleSince = Date.now() }
    while (pending >= 1) {
      const chunk = Math.min(120, Math.round(pending))
      pending -= chunk
      send({ type: 'beat', seconds: chunk }, beacon)
    }
  }
  window.setInterval(() => { if (visibleSince !== null && Date.now() - visibleSince >= 60_000) flush() }, 15_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { flush(true); visibleSince = null } else visibleSince = Date.now()
  })
  window.addEventListener('pagehide', () => flush(true))
}

export function trackGame(mode: 'run' | 'endless' | 'daily' | 'multi' | 'christmas') {
  if (enabled()) send({ type: 'game', mode })
}
