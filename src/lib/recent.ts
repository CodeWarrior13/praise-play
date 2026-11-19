import { loadSetting, saveSetting } from './storage'

/**
 * Songs heard recently on this device, newest last. New runs steer around them
 * so the same songs don't keep coming back game after game.
 */
const KEEP = 250

export function recentSongs(): Set<string> {
  return new Set(loadSetting<string[]>('recentSongs', []))
}

export function rememberSongs(ids: string[]) {
  const list = loadSetting<string[]>('recentSongs', []).filter((id) => !ids.includes(id))
  saveSetting('recentSongs', [...list, ...ids].slice(-KEEP))
}
