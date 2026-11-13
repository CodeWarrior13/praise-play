import type { GenreId } from './genres'

export type Song = {
  /** Stable internal identifier; do not use a title as an ID. */
  id: string
  title: string
  artist: string
  /** A short clue written by the catalog owner, not lyrics. */
  hint: string
  /** One or more tags from genres.ts; multiple tags are allowed. */
  genres: GenreId[]
  /** Provider reference/URL only when use is authorized; never a scraped file. */
  audioUrl?: string
  /** Start offset when supported by the authorized audio source. */
  previewStartSeconds?: number
  /** Optional provider identifier, useful for an authorized integration. */
  providerTrackId?: string
}

/** Fictional entries to demonstrate the data shape. */
export const songs: Song[] = [
  {
    id: 'demo-1',
    title: 'Light in the Valley',
    artist: 'The Sunday Sessions',
    hint: 'A fictional acoustic song about hope through a difficult season.',
    genres: ['christian-folk'],
  },
  {
    id: 'demo-2',
    title: 'All Things New',
    artist: 'Harbor & Hymn',
    hint: 'A fictional, upbeat band song centered on renewal and grace.',
    genres: ['christian-pop', 'christian-indie'],
  },
  {
    id: 'demo-3',
    title: 'You Are Near',
    artist: 'Mara Wells',
    hint: 'A fictional quiet piano ballad about finding comfort in God’s presence.',
    genres: ['contemporary-worship'],
  },
  {
    id: 'demo-4',
    title: 'Open Hands',
    artist: 'Northbound',
    hint: 'A fictional modern worship anthem about trust and surrender.',
    genres: ['contemporary-worship', 'christian-rock'],
  },
]
