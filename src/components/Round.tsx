import { useEffect, useMemo, useState } from 'react'
import { songs, type Song } from '../data/songs'
import { isCorrectGuess } from '../lib/daily'
import { getPreview, type Preview } from '../lib/preview'
import { DIFFICULTY, MIN_CLIP, WRONG_GUESS_PENALTY, formatPoints, formatSeconds, songPoints } from '../lib/scoring'
import type { SongResult } from '../lib/storage'
import { ClipPlayer } from './ClipPlayer'
import { GuessBox } from './GuessBox'

const songById = new Map(songs.map((song) => [song.id, song]))

type Props = {
  song: Song
  index: number
  total: number
  runScore: number
  nextSong?: Song
  onNext: (result: SongResult) => void
  onQuit: () => void
}

export function Round({ song, index, total, runScore, nextSong, onNext, onQuit }: Props) {
  const [unlocked, setUnlocked] = useState(MIN_CLIP)
  const [wrong, setWrong] = useState<string[]>([])
  const [result, setResult] = useState<SongResult | null>(null)
  const [preview, setPreview] = useState<Preview | null | 'loading'>('loading')
  const excluded = useMemo(() => new Set(wrong), [wrong])

  useEffect(() => {
    let live = true
    getPreview(song).then((found) => live && setPreview(found))
    // Warm up the next song so it is ready the moment this one ends.
    if (nextSong) getPreview(nextSong)
    return () => { live = false }
  }, [song, nextSong])

  function guess(choice: Song) {
    if (isCorrectGuess(choice, song)) {
      setResult({ songId: song.id, seconds: unlocked, wrongGuesses: wrong.length, points: songPoints(unlocked, wrong.length), outcome: 'named' })
    } else {
      setWrong((list) => [...list, choice.id])
    }
  }

  function skip() {
    setResult({ songId: song.id, seconds: unlocked, wrongGuesses: wrong.length, points: 0, outcome: 'skipped' })
  }

  const last = index === total - 1
  const art = preview && preview !== 'loading' ? preview.artworkUrl : undefined
  const link = preview && preview !== 'loading' ? preview.trackUrl : undefined

  return (
    <section className="card round" aria-label={`Song ${index + 1} of ${total}`}>
      <div className="round-head">
        <div className="steps" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => <span key={i} className={i < index ? 'done' : i === index ? 'now' : ''} />)}
        </div>
        <div className="round-meta">
          <span>Song {index + 1} of {total} · <em>{DIFFICULTY[Math.round((index / Math.max(1, total - 1)) * (DIFFICULTY.length - 1))]}</em></span>
          <span className="run-score">{formatPoints(runScore + (result?.points ?? 0))} pts</span>
        </div>
      </div>

      {!result ? (
        <>
          <ClipPlayer key={song.id} preview={preview} startSeconds={song.startSeconds ?? 0} unlocked={unlocked} onUnlock={setUnlocked} penalty={wrong.length * WRONG_GUESS_PENALTY} />
          {preview === null && <p className="notice">Couldn’t load audio for this song. Skip to see what it was.</p>}
          <GuessBox excluded={excluded} onGuess={guess} onSkip={skip} shake={wrong.length} />
          {wrong.length > 0 && (
            <ul className="wrong-list" aria-label="Wrong guesses">
              {wrong.map((id) => {
                const s = songById.get(id)
                return <li key={id}><span>✕ {s?.title} <em>— {s?.artist}</em></span><span className="minus">−{WRONG_GUESS_PENALTY}</span></li>
              })}
            </ul>
          )}
          <p className="hint-line">Press play for the first 0.1s. Drag the bar or tap a time to hear more — the less you hear, the more it’s worth.</p>
        </>
      ) : (
        <div className="reveal" role="status">
          <div className={`verdict ${result.outcome}`}>
            {result.outcome === 'named' ? (
              <>
                <strong>+{formatPoints(result.points)}</strong>
                <span>Named in {formatSeconds(result.seconds)}{result.wrongGuesses ? ` with ${result.wrongGuesses} wrong guess${result.wrongGuesses > 1 ? 'es' : ''}` : ''}</span>
              </>
            ) : (
              <>
                <strong>Skipped</strong>
                <span>No points for this one</span>
              </>
            )}
          </div>
          <div className="answer-card">
            {art ? <img src={art} alt="" width={96} height={96} /> : <div className="art-placeholder" aria-hidden="true">♪</div>}
            <div>
              <strong>{song.title}</strong>
              <span>{song.artist}{song.year ? ` · ${song.year}` : ''}</span>
              {link && <a href={link} target="_blank" rel="noreferrer">Listen on Apple Music ↗</a>}
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
