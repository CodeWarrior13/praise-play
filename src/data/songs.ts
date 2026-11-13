import type { GenreId } from './genres'

export type Song = {
  /** Stable internal identifier; do not use a title as an ID. */
  id: string
  title: string
  artist: string
  hint: string
  genres: GenreId[]
  /** Spotify track ID for the official post-round embed, if approved for this use. */
  spotifyTrackId?: string
}

/** Fictional examples only; replace with a manually curated, permitted catalog. */
export const songs: Song[] = [
  { id: 'demo-1', title: 'Light in the Valley', artist: 'The Sunday Sessions', hint: 'A fictional acoustic song about hope through a difficult season.', genres: ['christian-folk'] },
  { id: 'demo-2', title: 'All Things New', artist: 'Harbor & Hymn', hint: 'A fictional, upbeat band song centered on renewal and grace.', genres: ['christian-pop', 'christian-indie'] },
  { id: 'demo-3', title: 'You Are Near', artist: 'Mara Wells', hint: 'A fictional quiet piano ballad about finding comfort in God’s presence.', genres: ['contemporary-worship'] },
  { id: 'demo-4', title: 'Open Hands', artist: 'Northbound', hint: 'A fictional modern worship anthem about trust and surrender.', genres: ['contemporary-worship', 'christian-rock'] },
]
