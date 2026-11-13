/** Where to hear the full song after a round. */
export function appleMusicUrl(trackId: number | string): string {
  return `https://music.apple.com/us/song/${trackId}`
}

/**
 * Spotify has no public lookup from an Apple track, so this opens Spotify's
 * search for the exact title and artist; the song is the top result.
 * On phones with the Spotify app, it opens in the app.
 */
export function spotifyUrl(title: string, artist: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`
}
