/**
 * App-wide pause signal. Opening an overlay (like Help) calls pauseAll(); anything
 * that plays audio or counts time listens and freezes until resumeAll().
 */
const PAUSE = 'praise:pause'
const RESUME = 'praise:resume'

let paused = false

export function pauseAll() {
  if (paused) return
  paused = true
  document.body.dataset.overlay = 'open'
  window.dispatchEvent(new Event(PAUSE))
}

export function resumeAll() {
  if (!paused) return
  paused = false
  delete document.body.dataset.overlay
  window.dispatchEvent(new Event(RESUME))
}

export const isPaused = () => paused

/** Subscribe to pause/resume. Returns an unsubscribe function. */
export function onPauseChange(onPause: () => void, onResume?: () => void): () => void {
  window.addEventListener(PAUSE, onPause)
  if (onResume) window.addEventListener(RESUME, onResume)
  return () => {
    window.removeEventListener(PAUSE, onPause)
    if (onResume) window.removeEventListener(RESUME, onResume)
  }
}
