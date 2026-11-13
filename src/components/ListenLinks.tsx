import { appleMusicUrl, spotifyUrl } from '../lib/links'

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.2.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.5 1.3-2.6 0 0-2.5-1-2.5-3.8ZM14.1 5.8c.6-.8 1.1-1.8.9-2.8-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.7-1 2.7 1 .1 2-.5 2.7-1.3Z" /></svg>
)
const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.4a.6.6 0 0 1-.9.2c-2.4-1.5-5.4-1.8-9-1a.6.6 0 1 1-.3-1.2c3.9-.9 7.2-.5 9.9 1.1.3.2.4.6.3.9Zm1.2-2.7a.8.8 0 0 1-1 .3c-2.7-1.7-6.9-2.2-10.2-1.2a.8.8 0 1 1-.4-1.5c3.7-1.1 8.3-.6 11.4 1.4.3.2.4.7.2 1Zm.1-2.8C14.6 9 9.2 8.8 6.1 9.7a.9.9 0 1 1-.5-1.8c3.6-1.1 9.5-.9 13.2 1.3a.9.9 0 0 1-.9 1.7Z" /></svg>
)

type Props = { trackId: number | string; title: string; artist: string; compact?: boolean }

/** "Love this song?" buttons that open the full track on Apple Music or Spotify. */
export function ListenLinks({ trackId, title, artist, compact = false }: Props) {
  const label = `${title} by ${artist}`
  if (compact) {
    return (
      <span className="listen-icons">
        <a href={appleMusicUrl(trackId)} target="_blank" rel="noreferrer" className="apple" aria-label={`${label} on Apple Music`} title="Apple Music"><AppleIcon /></a>
        <a href={spotifyUrl(title, artist)} target="_blank" rel="noreferrer" className="spotify" aria-label={`${label} on Spotify`} title="Spotify"><SpotifyIcon /></a>
      </span>
    )
  }
  return (
    <div className="listen-row">
      <span className="listen-label">Love this one? Hear the full song</span>
      <div className="listen-buttons">
        <a className="listen-btn apple" href={appleMusicUrl(trackId)} target="_blank" rel="noreferrer" aria-label={`${label} on Apple Music`}><AppleIcon /> Apple Music</a>
        <a className="listen-btn spotify" href={spotifyUrl(title, artist)} target="_blank" rel="noreferrer" aria-label={`${label} on Spotify`}><SpotifyIcon /> Spotify</a>
      </div>
    </div>
  )
}
