import { useEffect, useRef, useState } from 'react'
import { artUrl, type Catalog } from '../lib/catalog'
import { getPreview, prefetchPreviews } from '../lib/preview'
import { formatPoints, formatSeconds } from '../lib/scoring'
import { CARD_STYLES, type SharedRun } from '../lib/shareRun'
import { ListenLinks } from './ListenLinks'
import { CountUp } from './Fx'

/**
 * What a friend sees when they open a shared score: each song with its cover,
 * how fast it was named, the points, a preview to play right here, and links to
 * the full song on Apple Music or Spotify.
 */
type Props = {
  shared: SharedRun
  catalog: Catalog
  /** Main button. Left out in the share preview. */
  onPlay?: () => void
  /** Overrides the colour packed in the link (the share preview's picker). */
  color?: number
}

export function ResultsCard({ shared, catalog, onPlay, color }: Props) {
  const style = CARD_STYLES[color ?? shared.color] ?? CARD_STYLES[0]
  const [playing, setPlaying] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const songs = shared.results.map((r) => ({ result: r, song: catalog.byId.get(r.songId) }))
  const named = shared.results.filter((r) => r.outcome === 'named').length

  useEffect(() => {
    prefetchPreviews(songs.flatMap((s) => (s.song ? [s.song] : [])))
    return () => { audio.current?.pause() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggle(id: string) {
    const entry = songs.find((s) => s.result.songId === id)?.song
    if (!entry) return
    if (playing === id) { audio.current?.pause(); setPlaying(null); return }
    const preview = await getPreview(entry)
    if (!preview) return
    audio.current?.pause()
    const el = new Audio(preview.audioUrl)
    el.currentTime = preview.startSeconds ?? 0
    el.onended = () => setPlaying(null)
    audio.current = el
    setPlaying(id)
    el.play().catch(() => setPlaying(null))
  }

  return (
    <section className={`card results-card enter${style.ink === 'dark' ? ' ink-dark' : ''}`} style={{ background: style.bg }} data-style={style.id}>
      <p className="eyebrow">{shared.christmas ? '🎄 Praise Play · Christmas' : '🎵 Praise Play results'}</p>
      <h2 className="rc-title">{shared.name ? `${shared.name} scored` : 'A friend scored'}</h2>
      <div className="total"><strong className="gradient-text"><CountUp value={shared.total} duration={1300} /></strong><span>pts</span></div>
      <p className="summary-verdict">Named {named} of {shared.results.length} song{shared.results.length === 1 ? '' : 's'}{shared.mode === 'endless' ? ' in Endless' : ''}. Can you beat it?</p>

      <ol className="rc-list">
        {songs.map(({ result, song }, i) => {
          const cover = song ? artUrl(song, 200) : undefined
          return (
            <li key={i} style={{ animationDelay: `${250 + i * 70}ms` }}>
              <div className="rc-cover">
                {cover ? <img src={cover} alt="" width={64} height={64} /> : <span>♪</span>}
                {song && (
                  <button className={`rc-play${playing === result.songId ? ' on' : ''}`} onClick={() => toggle(result.songId)} aria-label={playing === result.songId ? 'Stop preview' : `Play ${song.title}`}>
                    {playing === result.songId ? '❚❚' : '▶'}
                  </button>
                )}
              </div>
              <div className="rc-info">
                <strong>{song?.title ?? 'Unknown song'}</strong>
                <span>{song?.artist ?? ''}</span>
                <span className="rc-stats">
                  {result.outcome === 'named'
                    ? <>Heard {formatSeconds(result.seconds)}{result.elapsed ? ` · named in ${result.elapsed}s` : ''}{result.wrongGuesses ? ` · ${result.wrongGuesses} wrong` : ''}{result.hints ? ` · ${result.hints} hint${result.hints > 1 ? 's' : ''}` : ''}</>
                    : 'Skipped'}
                </span>
                {song && <ListenLinks compact trackId={song.trackId} title={song.title} artist={song.artist} />}
              </div>
              <strong className={`rc-points${result.points ? '' : ' zero'}`}>{result.points ? formatPoints(result.points) : '—'}</strong>
            </li>
          )
        })}
      </ol>
      {onPlay && <button className="primary big wide shine" onClick={onPlay}>▶ Play Praise Play</button>}
    </section>
  )
}
