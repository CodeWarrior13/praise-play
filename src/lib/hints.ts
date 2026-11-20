import { artUrl, type Catalog, type Song } from './catalog'
import { HINT_COSTS } from './scoring'

export type Hint =
  | { kind: 'text'; text: string }
  | { kind: 'year'; text: string; year: number }
  | { kind: 'genre'; text: string; genre: string }
  | { kind: 'cover'; text: string; cover: string }

/** Small stable hash so a song's hint order is the same on every device (rooms stay fair). */
function seed(id: string): number {
  let h = 2166136261
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

/**
 * Optional clues. Each costs points (HINT_COSTS, by position) and only appears
 * when asked for. The first two rotate song to song between the release year,
 * the album cover and the genre; naming the artist is always last.
 */
export function hintsFor(song: Song, catalog: Catalog): Hint[] {
  const genre = song.genres.map((id) => catalog.genres.find((g) => g.id === id)?.label).filter(Boolean)[0]
  const pool: Hint[] = []
  if (song.year) pool.push({ kind: 'year', text: 'Released in', year: song.year })
  const cover = artUrl(song, 300)
  if (cover) pool.push({ kind: 'cover', text: 'The album cover', cover })
  if (genre) pool.push({ kind: 'genre', text: 'Genre', genre })
  // Shuffle with the song's own seed (same order on every device), keep two.
  let s = seed(song.id)
  for (let i = pool.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0
    const j = s % (i + 1)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return [...pool.slice(0, 2), { kind: 'text' as const, text: `The artist is ${song.artist}` }].slice(0, HINT_COSTS.length)
}
