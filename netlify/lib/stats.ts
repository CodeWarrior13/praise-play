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
export const STATS_KEY_HASH = '269cc611bcfa0999988673a6e9b9395a25ee58950ddc2db41ce923561129b2d2'
