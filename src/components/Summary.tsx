import { useEffect, useState } from 'react'
import { MAX_POINTS, RUN_LENGTH, formatPoints, formatSeconds } from '../lib/scoring'
import type { Catalog } from '../lib/catalog'
import { ShareCard } from './ShareCard'
import type { SoloSettings } from './SoloSetup'
import type { RunRecord, Stats } from '../lib/storage'
import type { Mode } from '../App'
import { msUntilTomorrow } from '../lib/daily'
import { Confetti, CountUp } from './Fx'
import { ListenLinks } from './ListenLinks'
import { RunLeaderboard } from './Leaderboard'

function square(points: number, skipped: boolean): string {
  if (skipped) return '⬛'
  if (points >= 6500) return '🟩'
  if (points >= 4500) return '🟨'
  return '🟧'
}

function verdict(ratio: number): string {
  if (ratio >= 0.8) return 'Hallelujah — incredible ears!'
  if (ratio >= 0.6) return 'Well done. You know your worship.'
  if (ratio >= 0.4) return 'Solid run!'
  if (ratio > 0) return 'Good effort. Keep listening!'
  return 'Tough set. Try another run!'
}

type Props = { run: RunRecord; mode: Mode; daily: number | null; stats: Stats; setup?: SoloSettings; catalog: Catalog; christmas?: boolean; onAgain: () => void; onHome: () => void; onLeaderboard: () => void }

export function Summary({ run, mode, daily, stats, setup, catalog, christmas = false, onAgain, onHome, onLeaderboard }: Props) {
  const [sharing, setSharing] = useState(false)
  const endless = mode === 'endless'
  const named = run.results.filter((r) => r.outcome === 'named').length
  // Harder songs carry a bonus, so the best possible score counts it in.
  const max = Math.max(MAX_POINTS, run.results.reduce((sum, r) => sum + MAX_POINTS * (r.bonus ?? 1), 0))
  const leaderboardRun = mode === 'run' && run.results.length === RUN_LENGTH && (setup?.difficulty ?? 'mixed') === 'mixed' && !christmas
  const ratio = run.total / max
  const newBest = endless ? run.total > 0 && run.total >= (stats.bestEndless ?? 0) : run.total > 0 && run.total >= stats.best

  return (
    <section className="card summary enter">
      {(endless ? newBest : ratio >= 0.5) && <Confetti count={60} />}
      <p className="eyebrow">{daily ? `Day ${daily} complete` : endless ? 'Game over' : 'Run complete'}</p>
      <div className="total">
        <strong className="gradient-text"><CountUp value={run.total} duration={1400} /></strong>
        <span>{endless ? 'pts' : `/ ${formatPoints(max)}`}</span>
      </div>
      {newBest && <p className="best-badge">★ New personal best</p>}
      {endless ? (
        <p className="summary-verdict">{named} song{named === 1 ? '' : 's'} named · best {formatPoints(stats.bestEndless ?? run.total)} pts · {stats.bestEndlessSongs ?? named} songs</p>
      ) : (
        <>
          <div className="meter" aria-hidden="true"><span style={{ width: `${ratio * 100}%` }} /></div>
          <p className="summary-verdict">{verdict(ratio)}</p>
        </>
      )}
      <ol className={`result-list${run.results.length > 8 ? ' scroll' : ''}`}>
        {run.results.map((result, i) => (
          <li key={i} style={{ animationDelay: `${300 + Math.min(i, 12) * 70}ms` }}>
            <span className="sq">{square(result.points, result.outcome === 'skipped')}</span>
            <span className="result-song"><strong>{result.title}</strong><span>{result.artist}</span></span>
            <ListenLinks compact trackId={result.songId} title={result.title} artist={result.artist} />
            <span className="result-pts">
              <strong>{result.outcome === 'skipped' ? '—' : formatPoints(result.points)}</strong>
              <span>{result.outcome === 'skipped' ? 'skipped' : `${formatSeconds(result.seconds)} heard${result.elapsed !== undefined ? ` · ${result.elapsed}s` : ''}${result.wrongGuesses ? ` · ${result.wrongGuesses}✕` : ''}`}</span>
            </span>
          </li>
        ))}
      </ol>
      {leaderboardRun ? <RunLeaderboard run={run} onOpen={onLeaderboard} /> : mode === 'run' && <p className="muted small">{christmas ? 'Christmas games stay off the leaderboard.' : 'Leaderboard scores come from 5-song Mixed games.'}</p>}
      <div className="summary-actions">
        <button className="primary shine" onClick={() => setSharing(true)}>Share score</button>
        <button className="ghost" onClick={onAgain}>{daily ? 'Play a free run' : endless ? 'Play endless again' : 'Play again'}</button>
      </div>
      <button className="text-button" onClick={onHome}>Change run options</button>
      {daily && <Countdown />}
      {sharing && <ShareCard run={run} mode={mode} catalog={catalog} christmas={christmas} onClose={() => setSharing(false)} />}
    </section>
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
  return <p className="countdown">Next daily run in <strong>{pad(Math.floor(total / 3600))}:{pad(Math.floor((total % 3600) / 60))}:{pad(total % 60)}</strong></p>
}
