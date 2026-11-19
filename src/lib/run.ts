import type { Catalog, Song } from './catalog'
import { RUN_LENGTH } from './scoring'
import { hashString, seededRandom } from './daily'

export type Popularity = 'hits' | 'all' | 'deep'
/** Which part of the catalog to draw from. */
export type Library = 'all' | 'mine' | 'playlist'

export type RunOptions = {
  /** Genre IDs. Empty means every genre. */
  genres: string[]
  /** Artist names. Empty means every artist. */
  artists: string[]
  /** null means no limit on that end. */
  yearFrom: number | null
  yearTo: number | null
  popularity: Popularity
  library: Library
}

export const MAX_ARTISTS = 60

export const defaultOptions: RunOptions = { genres: [], artists: [], yearFrom: null, yearTo: null, popularity: 'all', library: 'all' }

/**
 * Hits and Deep cuts are relative to the songs you've picked, so every
 * combination has songs: Hits = the best-known 6% (at least 5 songs),
 * Deep cuts = the less-known 55%. "Deep cuts of the Assorted Playlist" means
 * the lesser-known songs on that playlist.
 */
export const HITS_SHARE = 0.06
export const DEEP_SHARE = 0.55

export function applyPopularity(songs: Song[], popularity: Popularity): Song[] {
  if (popularity === 'all' || songs.length <= 5) return songs
  const ranked = [...songs].sort((a, b) => b.popularity - a.popularity || a.trackId - b.trackId)
  const share = popularity === 'hits' ? HITS_SHARE : DEEP_SHARE
  const count = Math.min(ranked.length, Math.max(5, Math.ceil(ranked.length * share)))
  return popularity === 'hits' ? ranked.slice(0, count) : ranked.slice(ranked.length - count)
}

export function filterSongs(catalog: Catalog, options: RunOptions, ignore?: 'genres' | 'artists'): Song[] {
  const yearFrom = options.yearFrom ?? -Infinity
  const yearTo = options.yearTo ?? Infinity
  const yearFiltered = options.yearFrom !== null || options.yearTo !== null
  const artists = new Set(options.artists)
  const wantsChristmas = options.genres.includes('christmas')
  const wantsInstrumental = options.genres.includes('instrumental')
  const base = catalog.songs.filter((song) => {
    // Christmas and instrumental songs only appear when their genre is picked.
    if (ignore !== 'genres' && !wantsChristmas && song.genres.includes('christmas')) return false
    if (ignore !== 'genres' && !wantsInstrumental && song.genres.includes('instrumental')) return false
    if (ignore !== 'genres' && options.genres.length && !song.genres.some((genre) => options.genres.includes(genre))) return false
    if (options.library === 'playlist' && !song.playlist) return false
    if (options.library === 'mine' && !song.mine) return false
    if (ignore !== 'artists' && artists.size && !artists.has(song.artist)) return false
    return !(yearFiltered && (!song.year || song.year < yearFrom || song.year > yearTo))
  })
  return applyPopularity(base, options.popularity)
}

/**
 * Where each difficulty band starts, as a share of the ranked pool. Easy draws from
 * the top 2.5%, Legend from the bottom 45%, so song 1 is always a genuine hit even in
 * a pool of thousands.
 */
const BAND_EDGES = [0, 0.025, 0.1, 0.25, 0.55, 1]

/** Position along the difficulty curve (0 = easiest, 1 = hardest) → share of the ranked pool. */
function edgeAt(f: number): number {
  const x = Math.min(1, Math.max(0, f)) * (BAND_EDGES.length - 1)
  const i = Math.min(BAND_EDGES.length - 2, Math.floor(x))
  return BAND_EDGES[i] + (BAND_EDGES[i + 1] - BAND_EDGES[i]) * (x - i)
}

/** Every slot draws from at least this many songs, so small pools still vary. */
const MIN_BAND = 8

/** The [start, end) slice of a ranked pool for one difficulty band, widened to MIN_BAND. */
function bandSlice(total: number, from: number, to: number): [number, number] {
  let start = Math.min(Math.floor(from * total), Math.max(0, total - 1))
  let end = Math.max(start + 1, Math.floor(to * total))
  const want = Math.min(total, MIN_BAND)
  if (end - start < want) {
    const extra = want - (end - start)
    start = Math.max(0, start - Math.floor(extra / 2))
    end = Math.min(total, start + want)
    start = Math.max(0, end - want)
  }
  return [start, end]
}

/** Prefer songs not heard recently; fall back gracefully when everything has been. */
function pickFresh(choices: Song[], avoid: Set<string>, random: () => number): Song | undefined {
  const unheard = choices.filter((song) => !avoid.has(song.id))
  const list = unheard.length ? unheard : choices
  return list[Math.floor(random() * list.length)]
}

/**
 * Ranks the pool from best-known to least-known, splits it into difficulty bands
 * and draws one song at random from each, so every run starts easy and ends hard.
 * Never repeats an artist within a run when the pool allows it, and steers
 * around `avoid` (songs heard recently, including the whole previous game).
 */
export function buildRun(pool: Song[], random: () => number = Math.random, size: number = RUN_LENGTH, avoid: Set<string> = new Set()): Song[] {
  const ranked = [...pool].sort((a, b) => b.popularity - a.popularity || a.trackId - b.trackId)
  const length = Math.min(size, ranked.length)
  const artistCount = new Set(pool.map((song) => song.artist)).size
  const edges = Array.from({ length: length + 1 }, (_, i) => edgeAt(i / length))
  const picks: Song[] = []
  for (let band = 0; band < length; band++) {
    const [start, end] = bandSlice(ranked.length, edges[band], edges[band + 1])
    const slice = ranked.slice(start, end).filter((song) => !picks.includes(song))
    const pool2 = slice.length ? slice : ranked.filter((song) => !picks.includes(song))
    const fresh = artistCount >= length ? pool2.filter((song) => !picks.some((p) => p.artist === song.artist)) : pool2
    const pick = pickFresh(fresh.length ? fresh : pool2, avoid, random)
    if (pick) picks.push(pick)
  }
  return picks
}

/**
 * Endless mode: the nth song comes from a difficulty level that rises every few
 * songs, drawn from the same ranked bands as a normal run.
 */
export function endlessSong(pool: Song[], n: number, played: Set<string>, avoid: Set<string> = new Set()): Song | undefined {
  const ranked = [...pool].sort((a, b) => b.popularity - a.popularity || a.trackId - b.trackId)
  const level = Math.min(BAND_EDGES.length - 2, Math.floor(n / 3))
  const [start, end] = bandSlice(ranked.length, BAND_EDGES[level], BAND_EDGES[level + 1])
  let choices = ranked.slice(start, end).filter((song) => !played.has(song.id))
  if (!choices.length) choices = ranked.filter((song) => !played.has(song.id))
  return pickFresh(choices, avoid, Math.random)
}

export function endlessLevel(n: number): number {
  return Math.min(BAND_EDGES.length - 2, Math.floor(n / 3))
}

export function dailyRun(catalog: Catalog, dateKey: string): Song[] {
  return buildRun(filterSongs(catalog, defaultOptions), seededRandom(hashString(`praise-play:${dateKey}`)))
}
