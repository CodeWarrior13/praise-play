import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { artUrl, type Catalog, type Song } from '../lib/catalog'
import { isCorrectGuess } from '../lib/daily'
import { getPreview, prefetchPreviews, type Preview } from '../lib/preview'
import { filterSongs, type RunOptions } from '../lib/run'
import { MIN_CLIP, WRONG_GUESS_PENALTY, formatPoints, formatSeconds, songPoints } from '../lib/scoring'
import { loadSetting, saveSetting } from '../lib/storage'
import { ClientRoom, HostRoom, MAX_PLAYERS, cleanCode, cleanName, type Outcome, type PlayerView, type RoundResult, type ServerMessage } from '../lib/multiplayer'
import { ClipPlayer } from './ClipPlayer'
import { GuessBox } from './GuessBox'
import { ListenLinks } from './ListenLinks'
import { Confetti, CountUp } from './Fx'

type Props = { catalog: Catalog; options: RunOptions; initialCode?: string; onExit: () => void }

type View =
  | { phase: 'setup' }
  | { phase: 'connecting'; label: string }
  | { phase: 'lobby' }
  | { phase: 'round'; index: number; total: number; songId: string; nextSongId?: string; endsAt: number }
  | { phase: 'reveal'; index: number; total: number; songId: string; results: RoundResult[]; last: boolean }
  | { phase: 'end' }

const ROUND_CHOICES = [5, 10, 15, 20]

export function Multiplayer({ catalog, options, initialCode = '', onExit }: Props) {
  const [name, setName] = useState(() => loadSetting('playerName', ''))
  const [code, setCode] = useState(cleanCode(initialCode))
  const [view, setView] = useState<View>({ phase: 'setup' })
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [players, setPlayers] = useState<PlayerView[]>([])
  const [rounds, setRounds] = useState(5)
  const [answered, setAnswered] = useState<string[]>([])
  const [starting, setStarting] = useState(false)
  const host = useRef<HostRoom | null>(null)
  const client = useRef<ClientRoom | null>(null)
  const isHost = me === 'host'
  const pool = useMemo(() => filterSongs(catalog, options), [catalog, options])

  const onMessage = useCallback((message: ServerMessage) => {
    switch (message.t) {
      case 'welcome': setMe(message.you); setRoomCode(message.code); setView((v) => (v.phase === 'connecting' ? { phase: 'lobby' } : v)); break
      case 'lobby':
        setPlayers(message.players)
        setRounds(message.settings.rounds)
        if (message.phase === 'lobby') setView((v) => (v.phase === 'end' || v.phase === 'connecting' || v.phase === 'lobby' ? { phase: 'lobby' } : v))
        break
      case 'round':
        setAnswered([])
        setStarting(false)
        setView({ phase: 'round', index: message.index, total: message.total, songId: message.songId, nextSongId: message.nextSongId, endsAt: performance.now() + message.durationMs })
        break
      case 'status': setAnswered(message.answered); break
      case 'reveal':
        setPlayers(message.standings)
        setView({ phase: 'reveal', index: message.index, total: message.total, songId: message.songId, results: message.results, last: message.last })
        break
      case 'end': setPlayers(message.standings); setView({ phase: 'end' }); break
      case 'error': setError(message.message); if (message.fatal) setView({ phase: 'setup' }); break
    }
  }, [])

  useEffect(() => () => { host.current?.close(); client.current?.close() }, [])

  function rememberName() {
    const clean = cleanName(name)
    setName(clean)
    saveSetting('playerName', clean)
    return clean
  }

  async function create() {
    setError(null)
    setView({ phase: 'connecting', label: 'Creating your room…' })
    try {
      host.current = await HostRoom.create(rememberName(), onMessage)
    } catch (e) {
      setError((e as Error).message)
      setView({ phase: 'setup' })
    }
  }

  async function join() {
    if (cleanCode(code).length !== 5) { setError('Room codes are 5 letters or numbers.'); return }
    setError(null)
    setView({ phase: 'connecting', label: `Joining room ${cleanCode(code)}…` })
    try {
      client.current = await ClientRoom.join(code, rememberName(), onMessage, (reason) => {
        client.current = null
        setError(reason)
        setView({ phase: 'setup' })
      })
    } catch (e) {
      setError((e as Error).message)
      setView({ phase: 'setup' })
    }
  }

  function leave() {
    host.current?.close()
    client.current?.close()
    host.current = null
    client.current = null
    const url = new URL(location.href)
    url.searchParams.delete('room')
    history.replaceState(null, '', url)
    onExit()
  }

  async function start() {
    if (!host.current || !pool.length) return
    setStarting(true)
    await host.current.start(pool)
  }

  function submit(index: number, outcome: Outcome, seconds: number, wrong: number, elapsed: number) {
    const answer = { t: 'answer' as const, index, outcome, seconds, wrong, elapsed }
    if (host.current) host.current.submit('host', answer)
    else client.current?.answer(answer)
  }

  const inviteLink = `${location.origin}${location.pathname}?room=${roomCode}`

  /* ------------------------------------------------------------ screens */

  if (view.phase === 'setup' || view.phase === 'connecting') {
    const busy = view.phase === 'connecting'
    return (
      <section className="card mp enter">
        <p className="eyebrow"><span className="live-dot" /> Multiplayer</p>
        <h2 className="mp-title">Play with friends</h2>
        <p className="muted mp-sub">Make a private room, share the code, and race to name the same song. Up to {MAX_PLAYERS} players.</p>
        <label className="mp-label" htmlFor="mp-name">Your name</label>
        <input id="mp-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name your friends will see" maxLength={20} autoComplete="nickname" disabled={busy} />
        <div className="mp-choices">
          <div className="mp-choice">
            <strong>Host a room</strong>
            <span>Songs come from your current Run options ({pool.length.toLocaleString()} songs).</span>
            <button className="primary shine" onClick={create} disabled={busy || !name.trim()}>Create room</button>
          </div>
          <div className="mp-choice">
            <strong>Join a room</strong>
            <input className="field code-field" value={code} onChange={(e) => setCode(cleanCode(e.target.value))} placeholder="CODE" aria-label="Room code" maxLength={5} disabled={busy} onKeyDown={(e) => e.key === 'Enter' && join()} />
            <button className="ghost" onClick={join} disabled={busy || !name.trim() || code.length !== 5}>Join</button>
          </div>
        </div>
        {busy && <p className="mp-status"><span className="spinner small" /> {view.label}</p>}
        {error && <p className="notice">{error}</p>}
        <button className="text-button quit" onClick={leave}>Back</button>
      </section>
    )
  }

  if (view.phase === 'lobby') {
    return (
      <section className="card mp enter">
        <div className="room-code">
          <span>Room code</span>
          <strong>{roomCode.split('').map((c, i) => <i key={i} style={{ animationDelay: `${i * 60}ms` }}>{c}</i>)}</strong>
          <button className="ghost small-btn" onClick={() => copy(inviteLink)}>Copy invite link</button>
        </div>
        <div className="mp-players-head"><span>Players</span><span>{players.filter((p) => p.connected).length}/{MAX_PLAYERS}</span></div>
        <ul className="mp-players">
          {players.map((p) => (
            <li key={p.id} className={p.id === me ? 'me' : ''}>
              <span className="avatar" style={{ '--h': hue(p.name) } as React.CSSProperties}>{p.name.slice(0, 1).toUpperCase()}</span>
              <span>{p.name}{p.id === me && ' (you)'}</span>
              {p.host && <span className="host-tag">Host</span>}
            </li>
          ))}
        </ul>
        {isHost ? (
          <>
            <div className="option-label"><span>Songs per game</span></div>
            <div className="segmented four">
              {ROUND_CHOICES.map((n) => <button key={n} className={rounds === n ? 'active' : ''} onClick={() => host.current?.setRounds(n)}>{n}</button>)}
            </div>
            <button className="primary big wide shine" onClick={start} disabled={starting || !pool.length}>
              {starting ? <><span className="spinner small" /> Loading songs…</> : `Start game · ${players.filter((p) => p.connected).length} player${players.length === 1 ? '' : 's'}`}
            </button>
            <p className="muted small">Each song lasts 45 seconds. Everyone hears the same song; the less you need to hear, the more it’s worth.</p>
          </>
        ) : (
          <p className="mp-status"><span className="spinner small" /> Waiting for the host to start…</p>
        )}
        {error && <p className="notice">{error}</p>}
        <button className="text-button quit" onClick={leave}>Leave room</button>
      </section>
    )
  }

  if (view.phase === 'round') {
    const song = catalog.byId.get(view.songId)
    if (!song) return <section className="card mp"><p className="notice">This song isn’t in your copy of the catalog. Refresh the page to update.</p></section>
    return (
      <MultiRound
        key={`${view.index}:${view.songId}`}
        catalog={catalog}
        song={song}
        nextSong={view.nextSongId ? catalog.byId.get(view.nextSongId) : undefined}
        index={view.index}
        total={view.total}
        endsAt={view.endsAt}
        players={players}
        answered={answered}
        me={me}
        onAnswer={(outcome, seconds, wrong, elapsed) => submit(view.index, outcome, seconds, wrong, elapsed)}
        onLeave={leave}
      />
    )
  }

  if (view.phase === 'reveal') {
    const song = catalog.byId.get(view.songId)
    const mine = view.results.find((r) => r.id === me)
    return (
      <section className="card mp reveal-mp enter">
        <div className="round-meta"><span>Song {view.index + 1} of {view.total}</span><span className="run-score">{mine ? `+${formatPoints(mine.points)}` : ''}</span></div>
        {mine?.outcome === 'named' && <Confetti count={36} />}
        {song && <RevealCard song={song} />}
        <h3 className="mp-h3">This song</h3>
        <ol className="mp-results">
          {view.results.map((r, i) => (
            <li key={r.id} className={r.id === me ? 'me' : ''} style={{ animationDelay: `${150 + i * 50}ms` }}>
              <span className="avatar" style={{ '--h': hue(r.name) } as React.CSSProperties}>{r.name.slice(0, 1).toUpperCase()}</span>
              <span className="mp-name">{r.name}</span>
              <span className="mp-detail">{r.outcome === 'named' ? `${formatSeconds(r.seconds)}${r.wrong ? ` · ${r.wrong}✕` : ''} · ${r.elapsed}s` : r.outcome === 'skipped' ? 'skipped' : 'out of time'}</span>
              <strong className={r.points ? 'pos' : ''}>{r.points ? `+${formatPoints(r.points)}` : '—'}</strong>
            </li>
          ))}
        </ol>
        <h3 className="mp-h3">Leaderboard</h3>
        <Standings players={players} me={me} compact />
        {isHost ? (
          <button className="primary big wide" onClick={() => (view.last ? host.current?.finish() : host.current?.nextRound())} autoFocus>
            {view.last ? 'Final results' : 'Next song →'}
          </button>
        ) : (
          <p className="mp-status"><span className="spinner small" /> Waiting for the host…</p>
        )}
        <button className="text-button quit" onClick={leave}>Leave game</button>
      </section>
    )
  }

  // End of game
  const winner = players[0]
  return (
    <section className="card mp summary enter">
      <Confetti count={70} />
      <p className="eyebrow">Game over</p>
      <h2 className="mp-title">{winner?.id === me ? 'You won!' : `${winner?.name ?? 'Nobody'} wins!`}</h2>
      <div className="podium">
        {[1, 0, 2].map((place) => players[place] && (
          <div key={place} className={`podium-step p${place + 1}`} style={{ animationDelay: `${(2 - place) * 150 + 200}ms` }}>
            <span className="avatar big" style={{ '--h': hue(players[place].name) } as React.CSSProperties}>{players[place].name.slice(0, 1).toUpperCase()}</span>
            <strong>{players[place].name}</strong>
            <span><CountUp value={players[place].score} /></span>
            <div className="step">{place + 1}</div>
          </div>
        ))}
      </div>
      <Standings players={players} me={me} />
      <div className="summary-actions">
        {isHost ? <button className="primary" onClick={() => host.current?.backToLobby()}>Play again</button> : <span className="mp-status small">Host can start another game</span>}
        <button className="ghost" onClick={leave}>Leave room</button>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- pieces */

function MultiRound({ catalog, song, nextSong, index, total, endsAt, players, answered, me, onAnswer, onLeave }: {
  catalog: Catalog; song: Song; nextSong?: Song; index: number; total: number; endsAt: number
  players: PlayerView[]; answered: string[]; me: string
  onAnswer: (outcome: Outcome, seconds: number, wrong: number, elapsed: number) => void; onLeave: () => void
}) {
  const [unlocked, setUnlocked] = useState(MIN_CLIP)
  const [wrong, setWrong] = useState<string[]>([])
  const [done, setDone] = useState<{ outcome: Outcome; points: number } | null>(null)
  const [preview, setPreview] = useState<Preview | null | 'loading'>('loading')
  const [left, setLeft] = useState(() => Math.max(0, endsAt - performance.now()))
  const startedAt = useRef(performance.now())
  const excluded = useMemo(() => new Set(wrong), [wrong])
  const total_ms = useRef(Math.max(1, endsAt - performance.now()))

  useEffect(() => {
    let live = true
    getPreview(song).then((p) => live && setPreview(p))
    if (nextSong) prefetchPreviews([nextSong])
    return () => { live = false }
  }, [song, nextSong])

  const finish = useCallback((outcome: Outcome, seconds = unlocked, wrongCount = wrong.length) => {
    if (done) return
    const elapsed = Math.round((performance.now() - startedAt.current) / 100) / 10
    const points = outcome === 'named' ? songPoints(seconds, wrongCount) : 0
    setDone({ outcome, points })
    onAnswer(outcome, seconds, wrongCount, elapsed)
  }, [done, unlocked, wrong.length, onAnswer])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, endsAt - performance.now())
      setLeft(remaining)
      if (remaining <= 0) { window.clearInterval(timer); finish('timeout') }
    }, 200)
    return () => window.clearInterval(timer)
  }, [endsAt, finish])

  function guess(choice: Song) {
    if (isCorrectGuess(choice, song)) finish('named')
    else setWrong((list) => [...list, choice.id])
  }

  const connected = players.filter((p) => p.connected)
  const ratio = left / total_ms.current
  return (
    <section className="card round mp enter">
      <div className="round-head">
        <div className="steps" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${Math.min(total, 20)}, 1fr)` }}>
          {Array.from({ length: total }, (_, i) => <span key={i} className={i < index ? 'done' : i === index ? 'now' : ''} />)}
        </div>
        <div className="round-meta">
          <span>Song {index + 1} of {total}</span>
          <span className={`mp-clock${left < 10_000 ? ' hurry' : ''}`}>{Math.ceil(left / 1000)}s</span>
        </div>
        <div className="time-bar"><span style={{ transform: `scaleX(${ratio})` }} /></div>
      </div>

      {!done ? (
        <div className="round-body">
          <ClipPlayer key={song.id} preview={preview} startSeconds={0} unlocked={unlocked} onUnlock={setUnlocked} penalty={wrong.length * WRONG_GUESS_PENALTY} hotkeys onAudioError={() => setPreview(null)} />
          {preview === null && <p className="notice">This song’s audio didn’t load for you. Skip it; you won’t be the only one.</p>}
          <GuessBox catalog={catalog} excluded={excluded} onGuess={guess} onSkip={() => finish('skipped')} shake={wrong.length} />
          {wrong.length > 0 && (
            <ul className="wrong-list">
              {wrong.map((id) => {
                const s = catalog.byId.get(id)
                return <li key={id}><span>✕ {s?.title} <em>— {s?.artist}</em></span><span className="minus">−{WRONG_GUESS_PENALTY}</span></li>
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className={`locked-in ${done.outcome}`}>
          {done.outcome === 'named' && <Confetti count={30} />}
          <strong>{done.outcome === 'named' ? <>+<CountUp value={done.points} /></> : done.outcome === 'skipped' ? 'Skipped' : 'Out of time'}</strong>
          <span>{done.outcome === 'named' ? 'Locked in! Keep it quiet until everyone’s done.' : 'The answer is revealed when the round ends.'}</span>
        </div>
      )}

      <div className="mp-answered">
        <span>{answered.length}/{connected.length} answered</span>
        <div>
          {connected.map((p) => (
            <span key={p.id} title={p.name} className={`avatar tiny${answered.includes(p.id) ? ' in' : ''}${p.id === me ? ' me' : ''}`} style={{ '--h': hue(p.name) } as React.CSSProperties}>
              {p.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
      </div>
      <button className="text-button quit" onClick={onLeave}>Leave game</button>
    </section>
  )
}

function RevealCard({ song }: { song: Song }) {
  const [preview, setPreview] = useState<Preview | null | 'loading'>('loading')
  useEffect(() => { let live = true; getPreview(song).then((p) => live && setPreview(p)); return () => { live = false } }, [song])
  const loaded = preview && preview !== 'loading' ? preview : null
  const cover = artUrl(song, 600) ?? loaded?.artworkUrl
  return (
    <>
      <div className="answer-card">
        <div className="art-stack">
          <span className="vinyl" aria-hidden="true" />
          {cover ? <img src={cover} alt="" width={112} height={112} /> : <div className="art-placeholder" aria-hidden="true">♪</div>}
        </div>
        <div className="answer-text">
          <strong>{song.title}</strong>
          <span>{song.artist}</span>
          <span className="small">{[loaded?.album, song.year].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <ClipPlayer preview={preview} startSeconds={0} unlocked={30} autoPlay />
      <ListenLinks trackId={song.trackId} title={song.title} artist={song.artist} />
    </>
  )
}

function Standings({ players, me, compact = false }: { players: PlayerView[]; me: string; compact?: boolean }) {
  const shown = compact ? players.slice(0, 8) : players
  return (
    <ol className={`mp-standings${compact ? ' compact' : ''}`}>
      {shown.map((p, i) => (
        <li key={p.id} className={`${p.id === me ? 'me' : ''}${p.connected ? '' : ' gone'}`}>
          <span className="rank">{i + 1}</span>
          <span className="avatar" style={{ '--h': hue(p.name) } as React.CSSProperties}>{p.name.slice(0, 1).toUpperCase()}</span>
          <span className="mp-name">{p.name}{!p.connected && ' (left)'}</span>
          <strong><CountUp value={p.score} /></strong>
        </li>
      ))}
      {compact && players.length > shown.length && <li className="more">+{players.length - shown.length} more</li>}
    </ol>
  )
}

/** A stable colour per name for avatars. */
function hue(name: string): number {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => window.prompt('Copy this invite link:', text))
}
