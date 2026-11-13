import { normalize } from './daily'

export type Song = {
  /** The iTunes track ID as a string. Stable across catalog rebuilds. */
  id: string
  trackId: number
  title: string
  artist: string
  genres: string[]
  year?: number
  /** 1–100: how widely known the song is (artist fame × rank in their catalog). */
  popularity: number
  /** By an artist from the player's Spotify playlists. */
  mine: boolean
  /** The song itself is on one of the player's playlists. */
  playlist: boolean
  /** Album cover path, or undefined if Apple had none. Use artUrl() to build a URL. */
  art?: string
  /** Pre-normalized "title artist" for fast searching. */
  search: string
}

export type Artist = { name: string; genres: string[]; mine: boolean; songCount: number }

export type Catalog = {
  songs: Song[]
  artists: Artist[]
  genres: { id: string; label: string }[]
  byId: Map<string, Song>
  yearMin: number
  yearMax: number
}

type RawCatalog = {
  genres: Record<string, string>
  artists: { name: string; genres: string[]; mine?: boolean }[]
  arts?: string[]
  songs: [number, string, number, number, number, 0 | string[], number?, number?][]
}

let pending: Promise<Catalog> | null = null

export function loadCatalog(): Promise<Catalog> {
  pending ??= fetch(`${import.meta.env.BASE_URL}catalog.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`Catalog failed to load (${response.status})`)
      return response.json() as Promise<RawCatalog>
    })
    .then(parse)
    .catch((error) => {
      pending = null
      throw error
    })
  return pending
}

function parse(raw: RawCatalog): Catalog {
  const counts = new Array(raw.artists.length).fill(0)
  const songs: Song[] = raw.songs.map(([trackId, title, artistIndex, year, popularity, genres, art = -1, flags = 0]) => {
    const artist = raw.artists[artistIndex]
    counts[artistIndex] += 1
    return {
      id: String(trackId),
      trackId,
      title,
      artist: artist.name,
      genres: genres || artist.genres,
      year: year || undefined,
      popularity,
      mine: Boolean(artist.mine),
      playlist: flags === 1,
      art: art >= 0 ? raw.arts?.[art] : undefined,
      search: normalize(`${title} ${artist.name}`),
    }
  })
  const artists = raw.artists
    .map((artist, index) => ({ name: artist.name, genres: artist.genres, mine: Boolean(artist.mine), songCount: counts[index] }))
    .filter((artist) => artist.songCount > 0)
  const genres = Object.entries(raw.genres)
    .map(([id, label]) => ({ id, label }))
    .filter((genre) => songs.some((song) => song.genres.includes(genre.id)))
  const years = songs.flatMap((song) => (song.year ? [song.year] : []))
  return {
    songs,
    artists,
    genres,
    byId: new Map(songs.map((song) => [song.id, song])),
    yearMin: Math.min(...years),
    yearMax: Math.max(...years),
  }
}

/** Album cover URL at the given pixel size (Apple renders any size on request). */
export function artUrl(song: Song, size = 300): string | undefined {
  if (!song.art) return undefined
  const [server, path] = song.art.split('|')
  return `https://is${server}-ssl.mzstatic.com/image/thumb/${path}/${size}x${size}bb.jpg`
}
