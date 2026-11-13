import { useMemo, useState } from 'react'
import { genres, type GenreId } from './data/genres'
import { songs, type Song } from './data/songs'

const CLIP_STAGES = [1, 3, 5, 10, 15] as const
const STAGE_SCORES = [1000, 800, 600, 400, 200] as const

type RoundResult = { correct: boolean; score: number; stage: number }

function utcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function hash(value: string): number {
  let result = 0
  for (const character of value) result = (result * 31 + character.charCodeAt(0)) >>> 0
  return result
}

function getDailySong(candidates: Song[], dateKey: string, genre: string): Song | undefined {
  if (!candidates.length) return undefined
  return candidates[hash(`${dateKey}:${genre}`) % candidates.length]
}

function getChoices(answer: Song, candidates: Song[], seed: string): Song[] {
  const others = candidates.filter((song) => song.id !== answer.id)
  const rotated = others.slice(hash(seed) % Math.max(others.length, 1))
  const distractors = [...rotated, ...others.slice(0, hash(seed) % Math.max(others.length, 1))].slice(0, 3)
  return [...distractors, answer]
}

function spotifyTrackUrl(trackId?: string): string | undefined {
  return trackId && /^[a-zA-Z0-9]{22}$/.test(trackId)
    ? `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`
    : undefined
}

export default function App() {
  const dateKey = useMemo(() => utcDateKey(), [])
  const [genre, setGenre] = useState<GenreId | 'all'>('all')
  const [stage, setStage] = useState(0)
  const [result, setResult] = useState<RoundResult | null>(null)

  const candidates = useMemo(
    () => genre === 'all' ? songs : songs.filter((song) => song.genres.includes(genre)),
    [genre],
  )
  const answer = getDailySong(candidates, dateKey, genre)
  const choices = useMemo(
    () => answer ? getChoices(answer, candidates, `${dateKey}:${genre}`) : [],
    [answer, candidates, dateKey, genre],
  )

  function advance() {
    if (result) return
    if (stage < CLIP_STAGES.length - 1) {
      setStage((current) => current + 1)
    } else {
      setResult({ correct: false, score: 0, stage })
    }
  }

  function submitGuess(song: Song) {
    if (result || !answer) return
    if (song.id === answer.id) {
      setResult({ correct: true, score: STAGE_SCORES[stage], stage })
    } else {
      advance()
    }
  }

  function changeGenre(value: GenreId | 'all') {
    setGenre(value)
    setStage(0)
    setResult(null)
  }

  if (!answer) {
    return (
      <main className="page">
        <section className="card" aria-labelledby="game-title">
          <a className="brand" href="/"><span className="brand-mark">♪</span> praise play</a>
          <h1 id="game-title">Not enough songs <em>yet.</em></h1>
          <p className="intro">This genre needs at least one catalog entry. Add songs in <code>src/data/songs.ts</code> or choose another genre.</p>
          <label className="genre-control">Genre
            <select value={genre} onChange={(event) => changeGenre(event.target.value as GenreId | 'all')}>
              <option value="all">All genres</option>
              {genres.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
        </section>
      </main>
    )
  }

  const spotifyEmbed = result ? spotifyTrackUrl(answer.spotifyTrackId) : undefined

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Praise Play home"><span className="brand-mark">♪</span> praise play</a>
        <span className="date-label">DAILY CHALLENGE · {dateKey}</span>
      </header>

      <section className="card" aria-labelledby="game-title">
        <div className="eyebrow"><span className="live-dot" /> A little music for your day</div>
        <h1 id="game-title">Name that <em>song.</em></h1>
        <p className="intro">Guess the mystery track. Wrong guesses and skips unlock the next listening stage.</p>

        <label className="genre-control">Play a genre
          <select value={genre} onChange={(event) => changeGenre(event.target.value as GenreId | 'all')}>
            <option value="all">All Christian music</option>
            {genres.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>

        <div className="player" aria-live="polite">
          <div className="record" aria-hidden="true"><span>✦</span></div>
          <div className="track-info">
            <span className="track-label">MYSTERY TRACK</span>
            <strong>{result ? answer.title : 'Praise Play Daily Mix'}</strong>
            <span>{result ? answer.artist : `Listening stage ${stage + 1} of ${CLIP_STAGES.length} · ${CLIP_STAGES[stage]} seconds`}</span>
          </div>
          <span className="demo-badge">{result ? 'REVEALED' : 'STAGE ' + (stage + 1)}</span>
        </div>

        <div className="audio-note" role="note">
          {result
            ? 'The answer is revealed. A Spotify player can be shown below for a curated track, subject to Spotify’s current terms and permission for this game use.'
            : 'Spotify embeds do not provide a reliable way for this app to enforce these short, staged clips. Audio playback is not connected yet; the stages below are ready for a permitted audio source.'}
        </div>

        <div className="stage-list" aria-label="Clip progression">
          {CLIP_STAGES.map((seconds, index) => (
            <span className={index === stage ? 'stage-chip active' : index < stage ? 'stage-chip unlocked' : 'stage-chip'} key={seconds}>
              {seconds}s{index < stage ? ' ✓' : ''}
            </span>
          ))}
        </div>

        <div className="answers">
          <div className="answer-heading"><span>MAKE YOUR GUESS</span><span>{result ? 'ROUND COMPLETE' : 'WRONG GUESS UNLOCKS MORE'}</span></div>
          {choices.map((song, index) => (
            <button className="answer-option" key={song.id} onClick={() => submitGuess(song)} disabled={Boolean(result)}>
              <span className="option-number">0{index + 1}</span>
              <span>{result ? song.title : `Mystery song ${index + 1}`}</span>
              <span className="option-mark">{result && song.id === answer.id ? '✓' : '↗'}</span>
            </button>
          ))}
        </div>

        {!result && <div className="round-actions">
          <button className="secondary-button" onClick={advance}>Skip · unlock {stage < CLIP_STAGES.length - 1 ? `${CLIP_STAGES[stage + 1]}s` : 'answer'}</button>
          <span>Unlimited guesses at each stage</span>
        </div>}

        {result && <div className={`result ${result.correct ? 'result-win' : 'result-lose'}`} role="status">
          <strong>{result.correct ? 'You got it!' : 'Answer revealed'}</strong>
          <span>{result.correct ? `You scored ${result.score.toLocaleString()} points.` : 'No points this round. Come back tomorrow for another song.'}</span>
          {result.correct && <span>Score for this stage: {STAGE_SCORES[result.stage]} points.</span>}
        </div>}

        {result && spotifyEmbed && <section className="spotify-reveal" aria-label="Revealed song on Spotify">
          <h2>Listen to the revealed track</h2>
          <iframe
            title={`Spotify player for ${answer.title} by ${answer.artist}`}
            src={spotifyEmbed}
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </section>}

        {result && answer.spotifyTrackId && !spotifyEmbed && <p className="demo-note">Spotify track ID is missing or invalid. Add the 22-character ID to this catalog record.</p>}
        <p className="footnote">Daily challenge · Genre filters · No music files are stored by this starter</p>
      </section>
      <footer>Made for music that lifts the spirit <span>✦</span></footer>
    </main>
  )
}
