import type { Song } from './catalog'
import { findOnset } from './onset'

export type Preview = {
  audioUrl: string
  artworkUrl?: string
  /** Link to the track on Apple Music, shown with the answer for attribution. */
  trackUrl?: string
  album?: string
  year?: number
  /** Where the music actually starts (seconds), skipping a silent or near-silent intro. */
  startSeconds?: number
}

type ItunesTrack = {
  trackId?: number
  previewUrl?: string
  artworkUrl100?: string
  trackViewUrl?: string
  collectionName?: string
  releaseDate?: string
}

const cache = new Map<string, Promise<Preview | null>>()

/** JSONP fallback for browsers where the iTunes API's CORS headers misbehave. */
function jsonp(url: string, timeoutMs = 10_000): Promise<{ results?: ItunesTrack[] }> {
  return new Promise((resolve, reject) => {
    const callback = `__praisePlay${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    const w = window as unknown as Record<string, unknown>
    const timer = window.setTimeout(() => finish(new Error('Preview lookup timed out')), timeoutMs)
    function finish(error?: Error, data?: { results?: ItunesTrack[] }) {
      window.clearTimeout(timer)
      delete w[callback]
      script.remove()
      if (error) reject(error)
      else resolve(data ?? {})
    }
    w[callback] = (data: { results?: ItunesTrack[] }) => finish(undefined, data)
    script.onerror = () => finish(new Error('Preview lookup failed'))
    script.src = `${url}&callback=${callback}`
    document.head.appendChild(script)
  })
}

async function itunes(url: string): Promise<ItunesTrack[]> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(String(response.status))
    return ((await response.json()) as { results?: ItunesTrack[] }).results ?? []
  } catch {
    return (await jsonp(url)).results ?? []
  }
}

function toPreview(track: ItunesTrack): Preview | null {
  if (!track.previewUrl) return null
  return {
    audioUrl: track.previewUrl,
    artworkUrl: track.artworkUrl100?.replace('100x100bb', '600x600bb'),
    trackUrl: track.trackViewUrl,
    album: track.collectionName,
    year: track.releaseDate ? Number(track.releaseDate.slice(0, 4)) : undefined,
  }
}

type AudioCtor = new (channels: number, length: number, sampleRate: number) => OfflineAudioContext

/**
 * Downloads the preview once, works out where the music starts, and hands the
 * player a local copy so it doesn't download the file a second time.
 * If anything fails, the original URL is used from the start.
 */
async function withOnset(preview: Preview): Promise<Preview> {
  try {
    const Ctx = (window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: AudioCtor }).webkitOfflineAudioContext) as AudioCtor | undefined
    if (!Ctx) return preview
    const response = await fetch(preview.audioUrl)
    if (!response.ok) return preview
    const bytes = await response.arrayBuffer()
    const local = URL.createObjectURL(new Blob([bytes], { type: 'audio/mp4' }))
    const decoded = await new Ctx(1, 1, 22050).decodeAudioData(bytes.slice(0))
    return { ...preview, audioUrl: local, startSeconds: findOnset(decoded.getChannelData(0), decoded.sampleRate) }
  } catch {
    return preview
  }
}

/** Looks up previews for several songs in a single request (one per run). */
export function prefetchPreviews(songs: Song[]) {
  const missing = songs.filter((song) => !cache.has(song.id))
  if (!missing.length) return
  const batch = itunes(`https://itunes.apple.com/lookup?id=${missing.map((s) => s.trackId).join(',')}&entity=song`).catch(() => [] as ItunesTrack[])
  for (const song of missing) {
    cache.set(
      song.id,
      batch.then((tracks) => {
        const track = tracks.find((t) => t.trackId === song.trackId)
        const preview = track ? toPreview(track) : null
        return preview ? withOnset(preview) : null
      }),
    )
  }
}

export function getPreview(song: Song): Promise<Preview | null> {
  prefetchPreviews([song])
  return cache.get(song.id)!
}

/** Album art for a song, used for the decorative mosaic. */
export function artworkFor(song: Song): Promise<string | undefined> {
  return getPreview(song).then((preview) => preview?.artworkUrl)
}
