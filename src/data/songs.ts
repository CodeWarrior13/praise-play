export type Song = {
  id: string
  title: string
  artist: string
  hint: string
  /** A short preview URL that you have permission to use. */
  audioUrl?: string
  /** Offset into the preview/audio file where playback should start. */
  previewStartSeconds?: number
}

/**
 * Fictional entries to demonstrate the game flow. Replace these with a catalog
 * and audio previews you are authorized to use before publishing the game.
 */
export const songs: Song[] = [
  {
    id: 'demo-1',
    title: 'Light in the Valley',
    artist: 'The Sunday Sessions',
    hint: 'A fictional acoustic worship song about hope through a difficult season.',
  },
  {
    id: 'demo-2',
    title: 'All Things New',
    artist: 'Harbor & Hymn',
    hint: 'A fictional, upbeat band song centered on renewal and grace.',
  },
  {
    id: 'demo-3',
    title: 'You Are Near',
    artist: 'Mara Wells',
    hint: 'A fictional quiet piano ballad about finding comfort in God’s presence.',
  },
  {
    id: 'demo-4',
    title: 'Open Hands',
    artist: 'Northbound',
    hint: 'A fictional modern worship anthem about trust and surrender.',
  },
]
