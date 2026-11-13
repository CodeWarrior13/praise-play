import { useEffect, useMemo, useState } from 'react'
import type { Catalog, Song } from '../lib/catalog'
import { isCorrectGuess } from '../lib/daily'
import { getPreview, type Preview } from '../lib/preview'
import { DIFFICULTY, MIN_CLIP, WRONG_GUESS_PENALTY, formatSeconds, songPoints } from '../lib/scoring'
import type { SongResult } from '../lib/storage'
import { ClipPlayer } from './ClipPlayer'
import { GuessBox } from './GuessBox'
import { Confetti, CountUp } from './Fx'

type Props = {
  catalog: Catalog
  song: Song
  index: number
  total: number
  runScore: number
  onNext: (result: SongResult) => void
  onQuit: () => void
}

export function Round({ catalog, song, index, total, runScore, onNext, onQuit }: Props) {
  const [unlocked, setUnlocked] = useState(MIN_CLIP)
  const [wrong, setWrong] = useState<string[]>([])
  const [result, setResult] = useState<SongResult | null>(null)
  const [preview, setPreview] = useState<Preview | null | 'loading'>('loading')
  const excluded = useMemo(() => new Set(wrong), [wrong])

  useEffect(() => {
    let live = true
    getPreview(song).then((found) => live && setPreview(found))
    return () => { live = false }
  }, [song])

  function finish(outcome: SongResult['outcome']) {
    setResult({
      songId: song.id,
      title: song.title,
      artist: song.artist,
      seconds: unlocked,
      wrongGuesses: wrong.length,
      points: outcome === 'named' ? songPoints(unlocked, wrong.length) : 0,
      outcome,
    })
  }

  function guess(choice: Song) {
    if (isCorrectGuess(choice, song)) finish('named')
    else setWrong((list) => [...list, choice.id])
  }

  const last = index === total - 1
  const loaded = preview && preview !== 'loading' ? preview : null
  const difficulty = DIFFICULTY[Math.round((index / Math.max(1, total - 1)) * (DIFFICULTY.length - 1))]

  return (
    <section className="card round enter" aria-label={`Song ${index + 1} of ${total}`}>
      <div className="round-head">
        <div className="steps" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => <span key={i} className={i < index ? 'done' : i === index ? 'now' : ''} />)}
        </div>
        <div className="round-meta">
          <span>Song {index + 1} of {total} <span className={`badge d${index}`}>{difficulty}</span></span>
          <span className="run-score"><CountUp value={runScore + (result?.points ?? 0)} /> pts</span>
        </div>
      </div>

      {!result ? (
        <div className="round-body">
          <ClipPlayer key={song.id} preview={preview} startSeconds={0} unlocked={unlocked} onUnlock={setUnlocked} penalty={wrong.length * WRONG_GUESS_PENALTY} />
          {preview === null && <p className="notice">Couldn’t load audio for this song. Skip to see what it was.</p>}
          <GuessBox songs={catalog.songs} excluded={excluded} onGuess={guess} onSkip={() => finish('skipped')} shake={wrong.length} />
          {wrong.length > 0 && (
            <ul className="wrong-list" aria-label="Wrong guesses">
              {wrong.map((id) => {
                const s = catalog.byId.get(id)
                return <li key={id}><span>✕ {s?.title} <em>— {s?.artist}</em></span><span className="minus">−{WRONG_GUESS_PENALTY}</span></li>
              })}
            </ul>
          )}
          <p className="hint-line">Tap play for the first 0.1s · drag the bar or tap a time to hear more</p>
        </div>
      ) : (
        <div className="reveal" role="status">
          {result.outcome === 'named' && <Confetti />}
          <div className={`verdict ${result.outcome}`}>
            {result.outcome === 'named' ? (
              <>
                <strong>+<CountUp value={result.points} duration={900} /></strong>
                <span>Named in {formatSeconds(result.seconds)}{result.wrongGuesses ? ` · ${result.wrongGuesses} wrong guess${result.wrongGuesses > 1 ? 'es' : ''}` : ''}</span>
              </>
            ) : (
              <>
                <strong>Skipped</strong>
                <span>No points for this one</span>
              </>
            )}
          </div>
          <div className="answer-card">
            <div className="art-stack">
              <span className="vinyl" aria-hidden="true" />
              {loaded?.artworkUrl ? <img src={loaded.artworkUrl} alt={`${loaded.album ?? song.title} cover`} width={112} height={112} /> : <div className="art-placeholder" aria-hidden="true">♪</div>}
            </div>
            <div className="answer-text">
              <strong>{song.title}</strong>
              <span>{song.artist}</span>
              <span className="small">{[loaded?.album, song.year].filter(Boolean).join(' · ')}</span>
              {loaded?.trackUrl && <a href={loaded.trackUrl} target="_blank" rel="noreferrer">Listen on Apple Music ↗</a>}
            </div>
          </div>
          <ClipPlayer preview={preview} startSeconds={0} unlocked={30} />
          <button className="primary wide" onClick={() => onNext(result)} autoFocus>{last ? 'See results' : 'Next song →'}</button>
        </div>
      )}
      <button className="text-button quit" onClick={onQuit}>End run</button>
    </section>
  )
}

