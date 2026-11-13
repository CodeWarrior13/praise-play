import type { Catalog, Song } from './catalog'
import { RUN_LENGTH } from './scoring'
import { hashString, seededRandom } from './daily'

export type Popularity = 'hits' | 'all' | 'deep'

export type RunOptions = {
  /** Genre IDs. Empty means every genre. */
  genres: string[]
  /** Artist names. Empty means every artist. */
  artists: string[]
  /** null means no limit on that end. */
  yearFrom: number | null
  yearTo: number | null
  popularity: Popularity
}

export const HIT_THRESHOLD = 40
export const DEEP_THRESHOLD = 16
export const MAX_ARTISTS = 60

export const defaultOptions: RunOptions = { genres: [], artists: [], yearFrom: null, yearTo: null, popularity: 'all' }

export function matchesPopularity(song: Song, popularity: Popularity): boolean {
  if (popularity === 'hits') return song.popularity >= HIT_THRESHOLD
  if (popularity === 'deep') return song.popularity < DEEP_THRESHOLD
  return true
}

export function filterSongs(catalog: Catalog, options: RunOptions, ignore?: 'genres' | 'artists'): Song[] {
  const yearFrom = options.yearFrom ?? -Infinity
  const yearTo = options.yearTo ?? Infinity
  const yearFiltered = options.yearFrom !== null || options.yearTo !== null
  const artists = new Set(options.artists)
  return catalog.songs.filter((song) => {
    if (ignore !== 'genres' && options.genres.length && !song.genres.some((genre) => options.genres.includes(genre))) return false
    if (ignore !== 'artists' && artists.size && !artists.has(song.artist)) return false
    if (yearFiltered && (!song.year || song.year < yearFrom || song.year > yearTo)) return false
    return matchesPopularity(song, options.popularity)
  })
}

/**
 * Ranks the pool from best-known to least-known, splits it into RUN_LENGTH bands
 * and draws one song from each, so every run starts easy and ends hard.
 * Never repeats an artist within a run when the pool allows it.
 */
export function buildRun(pool: Song[], random: () => number = Math.random): Song[] {
  const ranked = [...pool].sort((a, b) => b.popularity - a.popularity || a.trackId - b.trackId)
  const length = Math.min(RUN_LENGTH, ranked.length)
  const artistCount = new Set(pool.map((song) => song.artist)).size
  const picks: Song[] = []
  for (let band = 0; band < length; band++) {
    const start = Math.floor((band * ranked.length) / length)
    const end = Math.floor(((band + 1) * ranked.length) / length)
    const slice = ranked.slice(start, end)
    const fresh = artistCount >= length ? slice.filter((song) => !picks.some((p) => p.artist === song.artist)) : slice
    const choices = (fresh.length ? fresh : slice).filter((song) => !picks.includes(song))
    picks.push(choices[Math.floor(random() * choices.length)] ?? slice[0])
  }
  return picks
}

export function dailyRun(catalog: Catalog, dateKey: string): Song[] {
  const pool = catalog.songs.filter((song) => !song.genres.includes('christmas') && !song.genres.includes('instrumental'))
  return buildRun(pool, seededRandom(hashString(`praise-play:${dateKey}`)))
}
