import type { GenreId } from './genres'
import { songs, type Song } from './songs'

export type Mode = {
  id: string
  label: string
  /** Songs with any of these tags are in the pool. Empty = every song. */
  genres: GenreId[]
}

export const modes: Mode[] = [
  { id: 'all', label: 'All Christian', genres: [] },
  { id: 'worship', label: 'Worship', genres: ['contemporary-worship', 'hymns'] },
  { id: 'pop', label: 'Pop & CCM', genres: ['christian-pop', 'christian-hip-hop', 'christian-r-and-b', 'christian-electronic'] },
  { id: 'rock', label: 'Rock', genres: ['christian-rock', 'christian-metal', 'christian-punk', 'christian-indie'] },
  { id: 'gospel', label: 'Gospel', genres: ['gospel', 'southern-gospel'] },
  { id: 'roots', label: 'Country & Roots', genres: ['christian-country', 'christian-folk', 'christian-latin', 'christian-jazz'] },
]

export function songsForMode(mode: Mode): Song[] {
  if (!mode.genres.length) return songs
  return songs.filter((song) => song.genres.some((genre) => mode.genres.includes(genre)))
}

export function findMode(id: string | null | undefined): Mode {
  return modes.find((mode) => mode.id === id) ?? modes[0]
}
