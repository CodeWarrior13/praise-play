import type { Song } from '../data/songs'
import { normalize } from './daily'

export type Preview = {
  audioUrl: string
  artworkUrl?: string
  /** Link to the track on Apple Music, shown with the answer for attribution. */
  trackUrl?: string
  album?: string
}

type ItunesTrack = {
  kind?: string
  trackName?: string
  artistName?: string
  collectionName?: string
  previewUrl?: string
  artworkUrl100?: string
  trackViewUrl?: string
}

const cache = new Map<string, Promise<Preview | null>>()

/** JSONP avoids CORS problems with the iTunes Search API in some browsers. */
function jsonp(url: string, timeoutMs = 10_000): Promise<{ results?: ItunesTrack[] }> {
  return new Promise((resolve, reject) => {
    const callback = `__praisePlay${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    const timer = window.setTimeout(() => finish(new Error('Preview lookup timed out')), timeoutMs)
    const w = window as unknown as Record<string, unknown>
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
    const data = (await response.json()) as { results?: ItunesTrack[] }
    return data.results ?? []
  } catch {
    return (await jsonp(url)).results ?? []
  }
}

function score(track: ItunesTrack, song: Song): number {
  const title = normalize(track.trackName ?? '')
  const artist = normalize(track.artistName ?? '')
  const wantTitle = normalize(song.title)
  const wantArtist = normalize(song.artist)
  let points = 0
  if (title === wantTitle) points += 4
  else if (title.startsWith(wantTitle) || wantTitle.startsWith(title)) points += 2
  if (artist === wantArtist) points += 4
  else if (artist.includes(wantArtist) || wantArtist.includes(artist)) points += 3
  if (/\b(live|instrumental|karaoke|remix|acoustic|tribute|cover)\b/i.test(`${track.trackName} ${track.collectionName}`)) points -= 2
  return points
}

function toPreview(track: ItunesTrack): Preview {
  return {
    audioUrl: track.previewUrl!,
    artworkUrl: track.artworkUrl100?.replace('100x100bb', '600x600bb'),
    trackUrl: track.trackViewUrl,
    album: track.collectionName,
  }
}

async function lookup(song: Song): Promise<Preview | null> {
  if (song.audioUrl) return { audioUrl: song.audioUrl }

  if (song.itunesTrackId) {
    const results = await itunes(`https://itunes.apple.com/lookup?id=${song.itunesTrackId}&entity=song`)
    const track = results.find((item) => item.previewUrl)
    if (track) return toPreview(track)
  }

  const params = new URLSearchParams({ term: `${song.title} ${song.artist}`, media: 'music', entity: 'song', limit: '15' })
  const results = (await itunes(`https://itunes.apple.com/search?${params}`)).filter((item) => item.previewUrl)
  if (!results.length) return null
  const best = results.reduce((a, b) => (score(b, song) > score(a, song) ? b : a))
  return score(best, song) >= 5 ? toPreview(best) : null
}

/** Finds a 30-second preview for a song. Results are cached for the session. */
export function getPreview(song: Song): Promise<Preview | null> {
  let pending = cache.get(song.id)
  if (!pending) {
    pending = lookup(song).catch(() => null)
    cache.set(song.id, pending)
  }
  return pending
}
