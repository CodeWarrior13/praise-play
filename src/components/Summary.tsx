import { useEffect, useState } from 'react'
import { MAX_POINTS, formatPoints, formatSeconds } from '../lib/scoring'
import type { RunRecord, Stats } from '../lib/storage'
import type { Mode } from '../App'
import { msUntilTomorrow } from '../lib/daily'
import { Confetti, CountUp } from './Fx'
import { ListenLinks } from './ListenLinks'

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

type Props = { run: RunRecord; mode: Mode; daily: number | null; stats: Stats; onAgain: () => void; onHome: () => void }

export function Summary({ run, mode, daily, stats, onAgain, onHome }: Props) {
  const [copied, setCopied] = useState(false)
  const endless = mode === 'endless'
  const named = run.results.filter((r) => r.outcome === 'named').length
  const max = MAX_POINTS * Math.max(1, run.results.length)
  const ratio = run.total / max
  const newBest = endless ? run.total > 0 && run.total >= (stats.bestEndless ?? 0) : run.total > 0 && run.total >= stats.best

  async function share() {
    const line = run.results.map((r) => `${square(r.points, r.outcome === 'skipped')} ${r.outcome === 'skipped' ? 'skip' : formatSeconds(r.seconds)}`).join('\n')
    const head = daily ? `Praise Play · Day ${daily}` : endless ? 'Praise Play · Endless' : 'Praise Play'
    const score = endless ? `${formatPoints(run.total)} pts · ${named} songs named` : `${formatPoints(run.total)} / ${formatPoints(max)}`
    const text = `${head}\n${score}\n${endless ? line.split('\n').map((l) => l.split(' ')[0]).join('') : line}\n${location.origin}${location.pathname}`
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 2000) }
    } catch {
      // Sharing was cancelled.
    }
  }

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
      <div className="summary-actions">
        <button className="primary shine" onClick={share}>{copied ? 'Copied!' : 'Share score'}</button>
        <button className="ghost" onClick={onAgain}>{daily ? 'Play a free run' : endless ? 'Play endless again' : 'Play again'}</button>
      </div>
      <button className="text-button" onClick={onHome}>Change run options</button>
      {daily && <Countdown />}
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
