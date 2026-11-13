import type { GenreId } from './genres'
import type { Song } from './songs'

/** The genre buttons shown in Run options. Each covers one or more tags from genres.ts. */
export type GenreGroup = { id: string; label: string; genres: GenreId[] }

export const genreGroups: GenreGroup[] = [
  { id: 'worship', label: 'Worship', genres: ['contemporary-worship'] },
  { id: 'pop', label: 'Pop & CCM', genres: ['christian-pop', 'christian-electronic'] },
  { id: 'rock', label: 'Rock', genres: ['christian-rock', 'christian-metal', 'christian-punk', 'christian-indie'] },
  { id: 'hiphop', label: 'Hip-Hop & R&B', genres: ['christian-hip-hop', 'christian-r-and-b'] },
  { id: 'gospel', label: 'Gospel', genres: ['gospel', 'southern-gospel'] },
  { id: 'country', label: 'Country & Folk', genres: ['christian-country', 'christian-folk'] },
  { id: 'hymns', label: 'Hymns', genres: ['hymns'] },
  { id: 'latin', label: 'Latin', genres: ['christian-latin'] },
  { id: 'christmas', label: 'Christmas', genres: ['holiday'] },
]

export function inGroup(song: Song, group: GenreGroup): boolean {
  return song.genres.some((genre) => group.genres.includes(genre))
}
