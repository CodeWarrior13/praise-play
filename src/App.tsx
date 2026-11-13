import { useEffect, useMemo, useRef, useState } from 'react'
import { songs, type Song } from './data/songs'

type SavedResult = { songId: string; correct: boolean }

function utcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

// A stable date hash keeps the daily song consistent for every player.
function dailySongIndex(dateKey: string, count: number): number {
  let hash = 0
  for (const character of dateKey) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return count ? hash % count : 0
}

function makeChoices(answer: Song, answerIndex: number): Song[] {
  if (songs.length <= 1) return [answer]
  const distractors = Array.from({ length: songs.length - 1 }, (_, offset) =>
    songs[(answerIndex + offset + 1) % songs.length],
  )
  // Keep the correct answer's position deterministic for the day too.
  const choices = [...distractors.slice(0, 3), answer]
  return choices.slice(0, 4)
}

function readSavedResult(dateKey: string): SavedResult | null {
  try {
    const value = localStorage.getItem(`praise-play:${dateKey}`)
    return value ? (JSON.parse(value) as SavedResult) : null
  } catch {
    return null
  }
}

export default function App() {
  const dateKey = useMemo(() => utcDateKey(), [])
  const answerIndex = dailySongIndex(dateKey, songs.length)
  const answer = songs[answerIndex]
  const choices = useMemo(() => makeChoices(answer, answerIndex), [answer, answerIndex])
  const [result, setResult] = useState<SavedResult | null>(() => readSavedResult(dateKey))
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !answer.audioUrl) return
    audio.currentTime = answer.previewStartSeconds ?? 0
    const stopAt = (answer.previewStartSeconds ?? 0) + 10
    const stopPlayback = () => {
      if (audio.currentTime >= stopAt) {
        audio.pause()
        setPlaying(false)
      }
    }
    audio.addEventListener('timeupdate', stopPlayback)
    return () => audio.removeEventListener('timeupdate', stopPlayback)
  }, [answer])

  async function toggleAudio() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    try {
      const start = answer.previewStartSeconds ?? 0
      if (audio.currentTime < start || audio.currentTime >= start + 10) audio.currentTime = start
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  function submitGuess(song: Song) {
    if (result) return
    const nextResult = { songId: song.id, correct: song.id === answer.id }
    setResult(nextResult)
    try {
      localStorage.setItem(`praise-play:${dateKey}`, JSON.stringify(nextResult))
    } catch {
      // The game still works if browser storage is unavailable.
    }
    audioRef.current?.pause()
    setPlaying(false)
  }

  if (!answer) {
    return <main className="page"><section className="card"><p>Add authorized song entries in <code>src/data/songs.ts</code> to begin.</p></section></main>
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Praise Play home"><span className="brand-mark">♪</span> praise play</a>
        <span className="date-label">DAILY CHALLENGE · {dateKey}</span>
      </header>

      <section className="card" aria-labelledby="game-title">
        <div className="eyebrow"><span className="live-dot" /> A little music for your day</div>
        <h1 id="game-title">Name that <em>song.</em></h1>
        <p className="intro">Listen to today’s track and choose the song. A new challenge arrives every day.</p>

        <div className="player">
          <div className="record" aria-hidden="true"><span>✦</span></div>
          <div className="track-info">
            <span className="track-label">TODAY’S MYSTERY TRACK</span>
            <strong>{result ? answer.title : 'Praise Play Daily Mix'}</strong>
            <span>{result ? answer.artist : 'Your 10-second preview'}</span>
          </div>
          {answer.audioUrl ? (
            <button className="play-button" onClick={toggleAudio} aria-label={playing ? 'Pause preview' : 'Play preview'}>
              {playing ? 'Ⅱ' : '▶'}
            </button>
          ) : <span className="demo-badge">DEMO</span>}
          {answer.audioUrl && <audio ref={audioRef} src={answer.audioUrl} preload="metadata" onEnded={() => setPlaying(false)} />}
        </div>

        {!answer.audioUrl && <p className="demo-note">Demo mode: add an authorized preview URL to this song to enable audio. For now, use the clue below.</p>}
        <div className="hint"><span className="hint-icon">✧</span><p><strong>Clue</strong>{result ? answer.hint : answer.hint}</p></div>

        <div className="answers">
          <div className="answer-heading"><span>MAKE YOUR GUESS</span><span>{result ? 'CHALLENGE COMPLETE' : 'PICK ONE'}</span></div>
          {choices.map((song, index) => {
            const chosen = result?.songId === song.id
            const isCorrect = result && song.id === answer.id
            return (
              <button
                className={`answer-option${chosen ? ' chosen' : ''}${isCorrect ? ' correct' : ''}${chosen && !result?.correct ? ' incorrect' : ''}`}
                key={song.id}
                onClick={() => submitGuess(song)}
                disabled={Boolean(result)}
              >
                <span className="option-number">0{index + 1}</span>
                <span>{song.title}</span>
                <span className="option-mark">{isCorrect ? '✓' : chosen ? '×' : '↗'}</span>
              </button>
            )
          })}
        </div>

        {result && <div className={`result ${result.correct ? 'result-win' : 'result-lose'}`} role="status">
          <strong>{result.correct ? 'You got it!' : 'Good try!'}</strong>
          <span>{result.correct ? 'Come back tomorrow for another song.' : `Today’s answer was “${answer.title}” by ${answer.artist}.`}</span>
        </div>}
        <p className="footnote">One daily song · No account needed · Progress stays on this device</p>
      </section>
      <footer>Made for music that lifts the spirit <span>✦</span></footer>
    </main>
  )
}
