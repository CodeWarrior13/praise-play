import { songs, type Song } from '../data/songs'
import { genreGroups, inGroup } from '../data/groups'
import { RUN_LENGTH } from './scoring'
import { hashString, seededRandom } from './daily'

export type RunOptions = {
  /** Genre group IDs. Empty means every genre. */
  groups: string[]
  /** Artist names. Empty means every artist. */
  artists: string[]
  yearFrom: number
  yearTo: number
  /** Only songs most listeners would know. */
  wellKnownOnly: boolean
}

const years = songs.flatMap((song) => (song.year ? [song.year] : []))
export const YEAR_MIN = Math.min(...years)
export const YEAR_MAX = Math.max(...years)
export const WELL_KNOWN = 6

export const defaultOptions: RunOptions = { groups: [], artists: [], yearFrom: YEAR_MIN, yearTo: YEAR_MAX, wellKnownOnly: false }

export function filterSongs(options: RunOptions, ignore?: 'groups' | 'artists'): Song[] {
  const groups = genreGroups.filter((group) => options.groups.includes(group.id))
  const fullRange = options.yearFrom <= YEAR_MIN && options.yearTo >= YEAR_MAX
  return songs.filter((song) => {
    if (ignore !== 'groups' && groups.length && !groups.some((group) => inGroup(song, group))) return false
    if (ignore !== 'artists' && options.artists.length && !options.artists.includes(song.artist)) return false
    if (!fullRange && (!song.year || song.year < options.yearFrom || song.year > options.yearTo)) return false
    if (options.wellKnownOnly && song.popularity < WELL_KNOWN) return false
    return true
  })
}

/**
 * Picks one song from each difficulty band: the pool is ranked from best-known
 * to least-known and split into RUN_LENGTH bands, so a narrow pool (one artist)
 * still starts easy and ends hard.
 */
export function buildRun(pool: Song[], random: () => number = Math.random): Song[] {
  const ranked = [...pool].sort((a, b) => b.popularity - a.popularity || a.id.localeCompare(b.id))
  const length = Math.min(RUN_LENGTH, ranked.length)
  const picks: Song[] = []
  for (let band = 0; band < length; band++) {
    const start = Math.floor((band * ranked.length) / length)
    const end = Math.floor(((band + 1) * ranked.length) / length)
    picks.push(ranked[start + Math.floor(random() * (end - start))])
  }
  return picks
}

export function dailyRun(dateKey: string): Song[] {
  return buildRun(songs, seededRandom(hashString(`praise-play:${dateKey}`)))
}

/** Artists ordered by how many songs they have in the catalog. */
export function artistsByCount(pool: Song[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const song of pool) counts.set(song.artist, (counts.get(song.artist) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}
