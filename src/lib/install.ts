/**
 * "Add to home screen" support. Chrome/Edge/Android fire `beforeinstallprompt`,
 * which we hold on to so our own Install button can trigger it. iPhone/iPad
 * Safari has no prompt, so we show the Share → Add to Home Screen steps instead.
 */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let deferred: InstallEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallEvent
    notify()
  })
  window.addEventListener('appinstalled', () => { deferred = null; notify() })
}

export function isInstalled(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function isIos(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
}

/** 'prompt' = we can show the browser's install dialog; 'ios' = show manual steps; null = not available. */
export function installMode(): 'prompt' | 'ios' | null {
  if (isInstalled()) return null
  if (deferred) return 'prompt'
  if (isIos()) return 'ios'
  return null
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  notify()
  return outcome === 'accepted'
}

export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => { navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}) })
}
