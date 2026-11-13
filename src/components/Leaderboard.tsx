import { useEffect, useRef, useState } from 'react'
import { BOARD_SIZE, fetchBoards, myEntries, submitRun, wouldRank, type Boards, type Entry, type Submitted } from '../lib/leaderboard'
import { formatPoints, MAX_POINTS, RUN_LENGTH } from '../lib/scoring'
import { loadSetting, saveSetting, type RunRecord } from '../lib/storage'
import { pauseAll, resumeAll } from '../lib/pause'
import { CountUp } from './Fx'

type Tab = 'today' | 'allTime'

function BoardList({ entries, highlight }: { entries: Entry[]; highlight: Set<string> }) {
  if (!entries.length) return <p className="lb-empty">No scores yet. Be the first!</p>
  return (
    <ol className="lb-list">
      {entries.map((e, i) => (
        <li key={e.id} className={highlight.has(e.id) ? 'mine' : ''} style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}>
          <span className={`lb-rank r${i + 1}`}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
          <span className="lb-name">{e.name}</span>
          <span className="lb-named">{e.named}/{RUN_LENGTH}</span>
          <strong>{formatPoints(e.score)}</strong>
        </li>
      ))}
    </ol>
  )
}

/** The global top 50 for solo 5-song runs, today and all time. */
export function LeaderboardDialog({ onClose }: { onClose: () => void }) {
  const [boards, setBoards] = useState<Boards | null>(null)
  const [error, setError] = useState(false)
  const [tab, setTab] = useState<Tab>('today')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    pauseAll()
    dialogRef.current?.focus()
    fetchBoards().then(setBoards, () => setError(true))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); resumeAll() }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="help-dialog lb-dialog" role="dialog" aria-modal="true" aria-labelledby="lb-title" ref={dialogRef} tabIndex={-1}>
        <div className="help-head">
          <div>
            <p className="eyebrow">🏆 Global · solo runs</p>
            <h2 id="lb-title">Leaderboard</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close leaderboard">✕</button>
        </div>
        <div className="segmented lb-tabs">
          <button className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')}>Today</button>
          <button className={tab === 'allTime' ? 'active' : ''} onClick={() => setTab('allTime')}>All time</button>
        </div>
        {error ? (
          <p className="lb-empty">The leaderboard couldn’t be reached. Check your connection and try again.</p>
        ) : !boards ? (
          <p className="mp-status"><span className="spinner small" /> Loading scores…</p>
        ) : (
          <BoardList entries={tab === 'today' ? boards.today : boards.allTime} highlight={new Set(myEntries())} />
        )}
        <p className="muted small">Top {BOARD_SIZE} solo runs ({RUN_LENGTH} songs, out of {formatPoints(MAX_POINTS * RUN_LENGTH)}). Today resets at midnight UTC. Finish a solo run to post your score.</p>
      </div>
    </div>
  )
}

/** End of a solo run: check if the score places, and let the player post it. */
export function RunLeaderboard({ run, onOpen }: { run: RunRecord; onOpen: () => void }) {
  const [boards, setBoards] = useState<Boards | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [name, setName] = useState(() => loadSetting('playerName', ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [posted, setPosted] = useState<Submitted | null>(null)
  const complete = run.results.length === RUN_LENGTH

  useEffect(() => {
    if (complete) fetchBoards().then(setBoards, () => setUnavailable(true))
  }, [complete])

  if (!complete || unavailable) return null
  if (!boards) return <div className="lb-card"><p className="mp-status"><span className="spinner small" /> Checking the leaderboard…</p></div>

  const today = wouldRank(boards.today, run.total)
  const allTime = wouldRank(boards.allTime, run.total)

  async function post() {
    setSaving(true)
    setError(null)
    try {
      const clean = name.trim()
      saveSetting('playerName', clean)
      setPosted(await submitRun(clean, run.results))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (posted) {
    return (
      <div className="lb-card placed">
        <p className="lb-headline">🎉 You’re on the board!</p>
        <div className="lb-ranks">
          {posted.rank.today && <div><strong>#<CountUp value={posted.rank.today} /></strong><span>today</span></div>}
          {posted.rank.allTime && <div><strong>#<CountUp value={posted.rank.allTime} /></strong><span>all time</span></div>}
        </div>
        <button className="ghost wide" onClick={onOpen}>View leaderboard</button>
      </div>
    )
  }

  if (!today && !allTime) {
    const cutoff = boards.today[BOARD_SIZE - 1]?.score
    return (
      <div className="lb-card">
        <p className="lb-headline">Not on the leaderboard this time</p>
        <p className="muted small">{cutoff ? `Today’s top ${BOARD_SIZE} starts at ${formatPoints(cutoff)}.` : 'Name at least one song to place.'}</p>
        <button className="text-button" onClick={onOpen}>See the leaderboard</button>
      </div>
    )
  }

  return (
    <div className="lb-card placed">
      <p className="lb-headline">🏆 You placed {today ? <>#{today} today</> : null}{today && allTime ? ' and ' : ''}{allTime ? <>#{allTime} all time</> : null}!</p>
      <form className="lb-form" onSubmit={(e) => { e.preventDefault(); post() }}>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name for the board" maxLength={16} aria-label="Leaderboard name" autoFocus />
        <button className="primary" type="submit" disabled={saving || name.trim().length < 2}>{saving ? 'Saving…' : 'Post score'}</button>
      </form>
      {error && <p className="notice">{error}</p>}
    </div>
  )
}
