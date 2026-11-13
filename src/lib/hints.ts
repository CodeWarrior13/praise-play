import type { Catalog, Song } from './catalog'
import { HINT_COSTS } from './scoring'

/**
 * Optional clues, cheapest first. Each one costs points (HINT_COSTS) and only
 * appears when the player asks for it.
 */
export function hintsFor(song: Song, catalog: Catalog): string[] {
  const genre = song.genres.map((id) => catalog.genres.find((g) => g.id === id)?.label).filter(Boolean)[0]
  const words = song.title.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length
  return [
    [song.year ? `Released in ${song.year}` : 'Release year unknown', genre].filter(Boolean).join(' · '),
    `Artist starts with “${song.artist.replace(/^the\s+/i, '').charAt(0).toUpperCase()}” · title is ${words} word${words === 1 ? '' : 's'}`,
    `The artist is ${song.artist}`,
  ].slice(0, HINT_COSTS.length)
}
