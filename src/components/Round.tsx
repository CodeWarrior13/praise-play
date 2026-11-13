import { useEffect, useMemo, useRef, useState } from 'react'
import { artUrl, type Catalog, type Song } from '../lib/catalog'
import { isCorrectGuess } from '../lib/daily'
import { getPreview, type Preview } from '../lib/preview'
import { DIFFICULTY, MIN_CLIP, WRONG_GUESS_PENALTY, formatSeconds, hintPenalty, songPoints } from '../lib/scoring'
import { hintsFor } from '../lib/hints'
import { HintBox } from './HintBox'
import type { SongResult } from '../lib/storage'
import { ClipPlayer } from './ClipPlayer'
import { GuessBox } from './GuessBox'
import { ListenLinks } from './ListenLinks'
import { Confetti, CountUp } from './Fx'
import { onPauseChange } from '../lib/pause'

type Props = {
  catalog: Catalog
  song: Song
  /** Warmed up in the background so the next round starts instantly. */
  nextSong?: Song
  index: number
  /** Songs in the run, or null for endless mode. */
  total: number | null
  /** 0–4, picks the difficulty badge. */
  level: number
  runScore: number
  /** Endless mode only. */
  lives?: number
  maxLives?: number
  onNext: (result: SongResult) => void
  onQuit: () => void
}

export function Round({ catalog, song, nextSong, index, total, level, runScore, lives, maxLives = 3, onNext, onQuit }: Props) {
  const [unlocked, setUnlocked] = useState(MIN_CLIP)
  const [wrong, setWrong] = useState<string[]>([])
  const [hintsUsed, setHintsUsed] = useState(0)
  const hints = useMemo(() => hintsFor(song, catalog), [song, catalog])
  const [result, setResult] = useState<SongResult | null>(null)
  const [preview, setPreview] = useState<Preview | null | 'loading'>('loading')
  const startedAt = useRef<number | null>(null)
  const pausedAt = useRef<number | null>(null)

  // Don't count time spent reading Help toward "time to answer".
  useEffect(() => onPauseChange(
    () => { pausedAt.current = performance.now() },
    () => {
      if (pausedAt.current !== null && startedAt.current !== null) startedAt.current += performance.now() - pausedAt.current
      pausedAt.current = null
    },
  ), [])
  const excluded = useMemo(() => new Set(wrong), [wrong])
  const endless = total === null

  function unavailable() {
    onNext({ songId: song.id, title: song.title, artist: song.artist, seconds: 0, wrongGuesses: 0, points: 0, outcome: 'unavailable' })
  }

  useEffect(() => {
    let live = true
    getPreview(song).then((found) => {
      if (!live) return
      setPreview(found)
      // No preview on Apple's side any more: swap in another song, no penalty.
      if (found === null) unavailable()
    })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song])

  // Buffer the next song's audio while this one is being guessed.
  useEffect(() => {
    if (!nextSong) return
    let audio: HTMLAudioElement | null = null
    getPreview(nextSong).then((next) => {
      if (!next) return
      audio = new Audio()
      audio.preload = 'auto'
      audio.src = next.audioUrl
    })
    return () => { if (audio) audio.src = '' }
  }, [nextSong])

  function finish(outcome: SongResult['outcome']) {
    const elapsed = startedAt.current ? Math.round((performance.now() - startedAt.current) / 100) / 10 : undefined
    setResult({
      songId: song.id,
      title: song.title,
      artist: song.artist,
      seconds: unlocked,
      wrongGuesses: wrong.length,
      hints: hintsUsed,
      points: outcome === 'named' ? songPoints(unlocked, wrong.length, hintsUsed) : 0,
      outcome,
      elapsed,
    })
  }

  function guess(choice: Song) {
    if (isCorrectGuess(choice, song)) finish('named')
    else setWrong((list) => [...list, choice.id])
  }

  const last = total !== null && index === total - 1
  const loaded = preview && preview !== 'loading' ? preview : null
  const cover = artUrl(song, 600) ?? loaded?.artworkUrl
  const livesAfter = lives !== undefined && result?.outcome === 'skipped' ? lives - 1 : lives
  const gameOver = endless && livesAfter !== undefined && livesAfter <= 0

  return (
    <section className="card round enter" aria-label={endless ? `Endless, song ${index + 1}` : `Song ${index + 1} of ${total}`}>
      <div className="round-head">
        {endless ? (
          <div className="lives" aria-label={`${livesAfter} of ${maxLives} lives left`}>
            {Array.from({ length: maxLives }, (_, i) => <span key={i} className={i < (livesAfter ?? 0) ? 'heart' : 'heart lost'} aria-hidden="true">♥</span>)}
            <span className="endless-tag">Endless</span>
          </div>
        ) : (
          <div className="steps" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => <span key={i} className={i < index ? 'done' : i === index ? 'now' : ''} />)}
          </div>
        )}
        <div className="round-meta">
          <span>Song {index + 1}{total !== null && ` of ${total}`} <span className={`badge d${level}`}>{DIFFICULTY[level]}</span></span>
          <span className="run-score"><CountUp value={runScore + (result?.points ?? 0)} /> pts</span>
        </div>
      </div>

      {!result ? (
        <div className="round-body">
          <ClipPlayer
            key={song.id}
            preview={preview}
            startSeconds={0}
            unlocked={unlocked}
            onUnlock={setUnlocked}
            penalty={wrong.length * WRONG_GUESS_PENALTY + hintPenalty(hintsUsed)}
            onFirstPlay={() => { startedAt.current ??= performance.now() }}
            onAudioError={unavailable}
            hotkeys
          />
          <HintBox hints={hints} used={hintsUsed} onTake={() => setHintsUsed((n) => n + 1)} />
          <GuessBox
            catalog={catalog}
            excluded={excluded}
            onGuess={guess}
            onSkip={() => finish('skipped')}
            skipLabel={endless ? 'Skip −♥' : 'Skip'}
            shake={wrong.length}
          />
          {wrong.length > 0 && (
            <ul className="wrong-list" aria-label="Wrong guesses">
              {wrong.map((id) => {
                const s = catalog.byId.get(id)
                return <li key={id}><span>✕ {s?.title} <em>— {s?.artist}</em></span><span className="minus">−{WRONG_GUESS_PENALTY}</span></li>
              })}
            </ul>
          )}
          <p className="hint-line">
            <kbd>Space</kbd> play · tap <kbd>A</kbd> replay · tap <kbd>D</kbd> +1s · tap <kbd>H</kbd> help · just type to search
          </p>
        </div>
      ) : (
        <div className="reveal" role="status">
          {result.outcome === 'named' && <Confetti />}
          <div className={`verdict ${result.outcome}`}>
            {result.outcome === 'named' ? (
              <>
                <strong>+<CountUp value={result.points} duration={900} /></strong>
                <span>{result.wrongGuesses ? `${result.wrongGuesses} wrong guess${result.wrongGuesses > 1 ? 'es' : ''} · ` : ''}{result.points === 10_000 ? 'Perfect!' : 'Nice ears!'}</span>
              </>
            ) : (
              <>
                <strong>{gameOver ? 'Game over' : 'Skipped'}</strong>
                <span>{endless ? (gameOver ? 'Out of lives' : `${livesAfter} ${livesAfter === 1 ? 'life' : 'lives'} left`) : 'No points for this one'}</span>
              </>
            )}
          </div>
          <div className="reveal-stats">
            <div><strong>{formatSeconds(result.seconds)}</strong><span>heard</span></div>
            <div><strong>{result.elapsed !== undefined ? `${result.elapsed}s` : '—'}</strong><span>to {result.outcome === 'named' ? 'answer' : 'skip'}</span></div>
            <div><strong>{result.wrongGuesses}{result.hints ? ` · ${result.hints}💡` : ''}</strong><span>wrong{result.hints ? ' · hints' : ''}</span></div>
          </div>
          <div className="answer-card">
            <div className="art-stack">
              <span className="vinyl" aria-hidden="true" />
              {cover ? <img src={cover} alt={`${loaded?.album ?? song.title} cover`} width={112} height={112} /> : <div className="art-placeholder" aria-hidden="true">♪</div>}
            </div>
            <div className="answer-text">
              <strong>{song.title}</strong>
              <span>{song.artist}</span>
              <span className="small">{[loaded?.album, song.year].filter(Boolean).join(' · ')}</span>

            </div>
          </div>
          <ClipPlayer preview={preview} startSeconds={0} unlocked={30} autoPlay />
          <ListenLinks trackId={song.trackId} title={song.title} artist={song.artist} />
          <button className="primary wide" onClick={() => onNext(result)} autoFocus>
            {gameOver || last ? 'See results' : 'Next song →'}
          </button>
        </div>
      )}
      <button className="text-button quit" onClick={onQuit}>{endless ? 'End game' : 'End run'}</button>
    </section>
  )
}
