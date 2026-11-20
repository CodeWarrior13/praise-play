export type Place = { visits: number; players: number; seconds: number; games: number }
export type Day = {
  visits: number
  /** Different players that day (each device counts once a day). */
  players: number
  /** Players who had played on an earlier day. */
  returning: number
  seconds: number
  games: Record<string, number>
  countries: Record<string, Place & { name: string }>
  /** Keyed "City|Region|CC". */
  cities: Record<string, Place>
}

export const emptyDay = (): Day => ({ visits: 0, players: 0, returning: 0, seconds: 0, games: {}, countries: {}, cities: {} })

/**
 * SHA-256 of the dashboard passphrase (the passphrase itself is never in the
 * code). To change it, set a STATS_KEY environment variable on Netlify; that
 * replaces this one.
 */
export const STATS_KEY_HASH = 'ee2942b0b3d48d31c6902a5bc4dad35b96321c97e17918767c1cb1117c65565b'
