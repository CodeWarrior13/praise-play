import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { songs, type Song } from './data/songs'
import { findMode, modes, songsForMode, type Mode } from './data/modes'
import {
  CLIP_STAGES,
  MAX_ATTEMPTS,
  dailySong,
  isCorrectGuess,
  localDateKey,
  msUntilTomorrow,
  normalize,
  puzzleNumber,
  randomSong,
} from './lib/daily'
import { getPreview, type Preview } from './lib/preview'
import { loadRound, loadSetting, loadStats, recordResult, saveRound, saveSetting, type Attempt, type Round, type Stats } from './lib/storage'

const songById = new Map(songs.map((song) => [song.id, song]))
const LONGEST = CLIP_STAGES[CLIP_STAGES.length - 1]

type Play = 'daily' | 'practice'

export default function App() {
  const [modeId, setModeId] = useState(() => findMode(loadSetting('mode', 'all')).id)
  const [play, setPlay] = useState<Play>('daily')
  const [dialog, setDialog] = useState<'help' | 'stats' | null>(() => (loadSetting('seenHelp', false) ? null : 'help'))
  const [dateKey, setDateKey] = useState(localDateKey)
  const [statsVersion, setStatsVersion] = useState(0)
  const mode = findMode(modeId)

  // Roll over to the next puzzle at local midnight if the tab stays open.
  useEffect(() => {
    const timer = window.setTimeout(() => setDateKey(localDateKey()), msUntilTomorrow() + 500)
    return () => window.clearTimeout(timer)
  }, [dateKey])

  function chooseMode(id: string) {
    setModeId(id)
    saveSetting('mode', id)
  }

  function closeDialog() {
    if (dialog === 'help') saveSetting('seenHelp', true)
    setDialog(null)
  }

  return (
    <div className="page">
      <header className="topbar">
        <a className="brand" href="./" aria-label="Praise Play home">
          <span className="brand-mark" aria-hidden="true">♪</span> praise play
        </a>
        <nav className="top-actions">
          <button className="icon-button" onClick={() => setDialog('help')} aria-label="How to play">?</button>
          <button className="icon-button" onClick={() => setDialog('stats')} aria-label="Statistics">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 20V10h3v10H4Zm6.5 0V4h3v16h-3ZM17 20v-7h3v7h-3Z" /></svg>
          </button>
        </nav>
      </header>

      <div className="mode-bar" role="tablist" aria-label="Genre">
        {modes.map((item) => (
          <button key={item.id} role="tab" aria-selected={item.id === mode.id} className={`chip${item.id === mode.id ? ' active' : ''}`} onClick={() => chooseMode(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="play-toggle" role="tablist" aria-label="Game type">
        <button role="tab" aria-selected={play === 'daily'} className={play === 'daily' ? 'active' : ''} onClick={() => setPlay('daily')}>Daily #{puzzleNumber(dateKey)}</button>
        <button role="tab" aria-selected={play === 'practice'} className={play === 'practice' ? 'active' : ''} onClick={() => setPlay('practice')}>Unlimited</button>
      </div>

      <Game key={`${mode.id}:${play}:${dateKey}`} mode={mode} play={play} dateKey={dateKey} onFinished={() => setStatsVersion((v) => v + 1)} onShowStats={() => setDialog('stats')} />

      <footer>Made for music that lifts the spirit <span>✦</span> Previews courtesy of Apple Music</footer>

      {dialog === 'help' && <HelpDialog onClose={closeDialog} />}
      {dialog === 'stats' && <StatsDialog key={statsVersion} mode={mode} onClose={closeDialog} />}
    </div>
  )
}

/* ---------------------------------------------------------------- Game */

function newRound(song: Song): Round {
  return { songId: song.id, attempts: [], status: 'playing' }
}

function Game({ mode, play, dateKey, onFinished, onShowStats }: { mode: Mode; play: Play; dateKey: string; onFinished: () => void; onShowStats: () => void }) {
  const pool = useMemo(() => songsForMode(mode), [mode])
  const [round, setRound] = useState<Round | null>(() => {
    if (play === 'practice') {
      const song = randomSong(pool)
      return song ? newRound(song) : null
    }
    const answer = dailySong(pool, mode.id, dateKey)
    if (!answer) return null
    const saved = loadRound(mode.id, dateKey)
    return saved && saved.songId === answer.id ? saved : newRound(answer)
  })
  const answer = round ? songById.get(round.songId) : undefined
  const [preview, setPreview] = useState<Preview | null | 'loading'>('loading')

  useEffect(() => {
    if (!answer) return
    let live = true
    setPreview('loading')
    getPreview(answer).then((result) => live && setPreview(result))
    return () => { live = false }
  }, [answer])

  const update = useCallback((next: Round) => {
    setRound(next)
    if (play === 'daily') {
      saveRound(mode.id, dateKey, next)
      if (next.status !== 'playing') {
        recordResult(mode.id, dateKey, next)
        onFinished()
      }
    }
  }, [play, mode.id, dateKey, onFinished])

  if (!round || !answer) {
    return <section className="card empty">No songs in this genre yet. Add some in <code>src/data/songs.ts</code>.</section>
  }

  const done = round.status !== 'playing'
  const stage = Math.min(round.attempts.length, MAX_ATTEMPTS - 1)
  const unlocked = done ? LONGEST : CLIP_STAGES[stage]
  const guessedIds = new Set(round.attempts.flatMap((a) => (a.kind === 'guess' ? [a.songId] : [])))

  function addAttempt(attempt: Attempt) {
    if (!round || done) return
    const attempts = [...round.attempts, attempt]
    const won = attempt.kind === 'guess' && attempt.correct
    update({ ...round, attempts, status: won ? 'won' : attempts.length >= MAX_ATTEMPTS ? 'lost' : 'playing' })
  }

  function guess(song: Song) {
    addAttempt({ kind: 'guess', songId: song.id, correct: isCorrectGuess(song, answer!) })
  }

  function nextPractice() {
    const song = randomSong(pool, answer!.id)
    if (song) setRound(newRound(song))
  }

  const audioReady = preview !== 'loading' && preview !== null

  return (
    <section className="card" aria-label="Song guessing game">
      <ol className="attempts" aria-label="Your guesses">
        {Array.from({ length: MAX_ATTEMPTS }, (_, index) => {
          const attempt = round.attempts[index]
          const current = !done && index === round.attempts.length
          let className = 'attempt'
          let label: React.ReactNode = <span className="attempt-empty">{CLIP_STAGES[index]}s</span>
          if (attempt?.kind === 'skip') { className += ' skipped'; label = <><span className="attempt-icon">»</span> Skipped</> }
          if (attempt?.kind === 'guess') {
            const song = songById.get(attempt.songId)
            className += attempt.correct ? ' right' : ' wrong'
            label = <><span className="attempt-icon">{attempt.correct ? '✓' : '✕'}</span> {song?.title} <span className="attempt-artist">— {song?.artist}</span></>
          }
          if (current) className += ' current'
          return <li key={index} className={className}>{label}</li>
        })}
      </ol>

      {done ? (
        <Reveal answer={answer} preview={preview} round={round} mode={mode} play={play} dateKey={dateKey} onNext={nextPractice} onShowStats={onShowStats} />
      ) : (
        <>
          <ClipPlayer key={answer.id} preview={preview} startSeconds={answer.startSeconds ?? 0} unlocked={unlocked} />
          {preview === null && <p className="notice">We couldn’t load audio for this song. You can still skip to give up, or try Unlimited mode.</p>}
          <GuessBox pool={pool} excluded={guessedIds} onGuess={guess} onSkip={() => addAttempt({ kind: 'skip' })} skipLabel={stage < MAX_ATTEMPTS - 1 ? `Skip (+${CLIP_STAGES[stage + 1] - CLIP_STAGES[stage]}s)` : 'Give up'} disabled={!audioReady && preview === 'loading'} />
        </>
      )}
    </section>
  )
}

/* ---------------------------------------------------------- Clip player */

function ClipPlayer({ preview, startSeconds, unlocked, full = false }: { preview: Preview | null | 'loading'; startSeconds: number; unlocked: number; full?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const frame = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [volume, setVolume] = useState(() => loadSetting('volume', 0.7))
  const ready = preview !== 'loading' && preview !== null
  const limit = full ? 30 : unlocked
  const scale = full ? 30 : LONGEST

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume, ready])
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current)
    audioRef.current?.pause()
    setPlaying(false)
  }, [])

  // A newly unlocked stage should start from the top.
  useEffect(() => { stop(); setPosition(0) }, [unlocked, stop])

  async function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { stop(); return }
    audio.currentTime = startSeconds
    setPosition(0)
    try {
      await audio.play()
    } catch {
      return
    }
    setPlaying(true)
    const tick = () => {
      const elapsed = audio.currentTime - startSeconds
      setPosition(Math.min(elapsed, limit))
      if (elapsed >= limit || audio.ended) { stop(); return }
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }

  function changeVolume(value: number) {
    setVolume(value)
    saveSetting('volume', value)
  }

  return (
    <div className={`player${full ? ' player-full' : ''}`}>
      <div className="timeline" aria-hidden="true">
        <div className="timeline-unlocked" style={{ width: `${(limit / scale) * 100}%` }} />
        <div className="timeline-progress" style={{ width: `${(position / scale) * 100}%` }} />
        {!full && CLIP_STAGES.slice(0, -1).map((value) => <span key={value} className="tick" style={{ left: `${(value / scale) * 100}%` }} />)}
      </div>
      <div className="player-row">
        <span className="time">{position.toFixed(1)}s</span>
        <button className="play-button" onClick={toggle} disabled={!ready} aria-label={playing ? 'Stop' : `Play ${full ? 'preview' : `${limit} second clip`}`}>
          {preview === 'loading' ? <span className="spinner" /> : playing ? <svg viewBox="0 0 24 24" width="22" height="22"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg> : <svg viewBox="0 0 24 24" width="24" height="24"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" /></svg>}
        </button>
        <span className="time">{full ? '30s' : `${limit}s`}</span>
      </div>
      <label className="volume">
        <span aria-hidden="true">🔈</span>
        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => changeVolume(Number(e.target.value))} aria-label="Volume" />
      </label>
      {preview && preview !== 'loading' && <audio ref={audioRef} src={preview.audioUrl} preload="auto" />}
    </div>
  )
}

/* ------------------------------------------------------------ Guessing */

function GuessBox({ pool, excluded, onGuess, onSkip, skipLabel, disabled }: { pool: Song[]; excluded: Set<string>; onGuess: (song: Song) => void; onSkip: () => void; skipLabel: string; disabled: boolean }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Song | null>(null)
  const [highlight, setHighlight] = useState(0)
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const q = normalize(query)
    if (q.length < 1 || selected) return []
    const words = q.split(' ')
    return pool
      .filter((song) => !excluded.has(song.id))
      .filter((song) => {
        const haystack = normalize(`${song.title} ${song.artist}`)
        return words.every((word) => haystack.includes(word))
      })
      .sort((a, b) => Number(!normalize(a.title).startsWith(q)) - Number(!normalize(b.title).startsWith(q)) || a.title.localeCompare(b.title))
      .slice(0, 8)
  }, [query, pool, excluded, selected])

  function pick(song: Song) {
    setSelected(song)
    setQuery(`${song.title} — ${song.artist}`)
    setOpen(false)
  }

  function submit() {
    const song = selected ?? (matches.length === 1 ? matches[0] : null)
    if (!song) return
    onGuess(song)
    setSelected(null)
    setQuery('')
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, matches.length - 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)) }
    else if (event.key === 'Escape') setOpen(false)
    else if (event.key === 'Enter') {
      event.preventDefault()
      if (open && matches[highlight]) pick(matches[highlight])
      else submit()
    }
  }

  return (
    <div className="guess">
      <div className="search">
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M10.5 4a6.5 6.5 0 0 1 5.2 10.4l4.4 4.4-1.4 1.4-4.4-4.4A6.5 6.5 0 1 1 10.5 4Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" /></svg>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); setHighlight(0); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Know it? Search for the title or artist"
          aria-label="Search for a song"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="song-options"
          autoComplete="off"
          spellCheck={false}
        />
        {query && <button className="clear" onClick={() => { setQuery(''); setSelected(null) }} aria-label="Clear search">✕</button>}
        {open && matches.length > 0 && (
          <ul className="suggestions" id="song-options" role="listbox">
            {matches.map((song, index) => (
              <li key={song.id} role="option" aria-selected={index === highlight} className={index === highlight ? 'highlight' : ''} onMouseDown={(e) => { e.preventDefault(); pick(song) }} onMouseEnter={() => setHighlight(index)}>
                <strong>{song.title}</strong> <span>{song.artist}</span>
              </li>
            ))}
          </ul>
        )}
        {open && query.trim().length > 1 && !selected && matches.length === 0 && <div className="suggestions none">No matching songs in this genre.</div>}
      </div>
      <div className="guess-actions">
        <button className="secondary" onClick={onSkip} disabled={disabled}>{skipLabel}</button>
        <button className="primary" onClick={submit} disabled={!selected && matches.length !== 1}>Submit</button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Reveal */

function shareText(round: Round, mode: Mode, play: Play, dateKey: string): string {
  const squares = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    const attempt = round.attempts[i]
    if (!attempt) return '⬜'
    if (attempt.kind === 'skip') return '⬛'
    return attempt.correct ? '🟩' : '🟥'
  }).join('')
  const score = round.status === 'won' ? `${round.attempts.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`
  const title = play === 'daily' ? `Praise Play #${puzzleNumber(dateKey)}` : 'Praise Play Unlimited'
  const seconds = round.status === 'won' ? ` in ${CLIP_STAGES[round.attempts.length - 1]}s` : ''
  return `${title} · ${mode.label}\n🎵 ${squares} ${score}${seconds}\n${location.origin}${location.pathname}`
}

function Reveal({ answer, preview, round, mode, play, dateKey, onNext, onShowStats }: { answer: Song; preview: Preview | null | 'loading'; round: Round; mode: Mode; play: Play; dateKey: string; onNext: () => void; onShowStats: () => void }) {
  const [copied, setCopied] = useState(false)
  const won = round.status === 'won'
  const art = preview && preview !== 'loading' ? preview.artworkUrl : undefined
  const link = preview && preview !== 'loading' ? preview.trackUrl : undefined

  async function share() {
    const text = shareText(round, mode, play, dateKey)
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 2000) }
    } catch {
      // Sharing was cancelled.
    }
  }

  return (
    <div className="reveal" role="status">
      <p className={`verdict ${won ? 'win' : 'lose'}`}>
        {won ? (round.attempts.length === 1 ? 'Incredible — first try!' : `You got it in ${CLIP_STAGES[round.attempts.length - 1]} seconds!`) : 'Not this time. Today’s song was…'}
      </p>
      <div className="answer-card">
        {art ? <img src={art} alt="" width={96} height={96} /> : <div className="art-placeholder" aria-hidden="true">♪</div>}
        <div>
          <strong>{answer.title}</strong>
          <span>{answer.artist}{answer.year ? ` · ${answer.year}` : ''}</span>
          {link && <a href={link} target="_blank" rel="noreferrer">Listen on Apple Music ↗</a>}
        </div>
      </div>
      <ClipPlayer preview={preview} startSeconds={0} unlocked={30} full />
      <div className="reveal-actions">
        <button className="primary" onClick={share}>{copied ? 'Copied!' : 'Share result'}</button>
        {play === 'practice' ? <button className="secondary" onClick={onNext}>Next song →</button> : <button className="secondary" onClick={onShowStats}>Statistics</button>}
      </div>
      {play === 'daily' && <Countdown />}
    </div>
  )
}

function Countdown() {
  const [ms, setMs] = useState(msUntilTomorrow)
  useEffect(() => {
    const timer = window.setInterval(() => setMs(msUntilTomorrow()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const total = Math.floor(ms / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return <p className="countdown">Next song in <strong>{pad(Math.floor(total / 3600))}:{pad(Math.floor((total % 3600) / 60))}:{pad(total % 60)}</strong></p>
}

/* ------------------------------------------------------------- Dialogs */

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-head">
          <h2 id="dialog-title">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close" autoFocus>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="How to play" onClose={onClose}>
      <ol className="help-steps">
        <li><span>▶</span> Press play to hear the first <strong>{CLIP_STAGES[0]} seconds</strong> of today’s song.</li>
        <li><span>⌕</span> Search for the title or artist and submit your guess.</li>
        <li><span>»</span> Wrong guesses and skips unlock more of the song: {CLIP_STAGES.join('s → ')}s.</li>
        <li><span>✦</span> You have {MAX_ATTEMPTS} tries. Fewer seconds means bragging rights.</li>
      </ol>
      <p className="muted">Pick a genre at the top. Each genre has its own daily song, and a new one arrives at midnight. Unlimited mode lets you keep practicing.</p>
      <button className="primary wide" onClick={onClose}>Let’s play</button>
    </Dialog>
  )
}

function StatsDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const stats: Stats = loadStats(mode.id)
  const most = Math.max(1, ...stats.distribution)
  const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0
  return (
    <Dialog title={`Statistics · ${mode.label}`} onClose={onClose}>
      <div className="stat-grid">
        <div><strong>{stats.played}</strong><span>Played</span></div>
        <div><strong>{winRate}%</strong><span>Win rate</span></div>
        <div><strong>{stats.currentStreak}</strong><span>Streak</span></div>
        <div><strong>{stats.maxStreak}</strong><span>Best streak</span></div>
      </div>
      <h3 className="dist-title">Solved at</h3>
      <div className="distribution">
        {stats.distribution.map((count, index) => (
          <div className="dist-row" key={index}>
            <span>{index < MAX_ATTEMPTS ? `${CLIP_STAGES[index]}s` : '✕'}</span>
            <div className="dist-bar"><div style={{ width: `${Math.max(4, (count / most) * 100)}%` }} className={index === MAX_ATTEMPTS ? 'miss' : ''}>{count}</div></div>
          </div>
        ))}
      </div>
      <p className="muted small">Daily games only. Progress stays on this device.</p>
    </Dialog>
  )
}
