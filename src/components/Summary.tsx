import { useState } from 'react'
import { songs } from '../data/songs'
import { MAX_POINTS, formatPoints, formatSeconds } from '../lib/scoring'
import type { RunRecord } from '../lib/storage'
import { msUntilTomorrow } from '../lib/daily'
import { useEffect } from 'react'

const songById = new Map(songs.map((song) => [song.id, song]))

function square(points: number, skipped: boolean): string {
  if (skipped) return '⬛'
  if (points >= 6500) return '🟩'
  if (points >= 4500) return '🟨'
  return '🟧'
}

function verdict(total: number, max: number): string {
  const ratio = total / max
  if (ratio >= 0.8) return 'Hallelujah! Incredible ears.'
  if (ratio >= 0.6) return 'Well done — you know your worship.'
  if (ratio >= 0.4) return 'Solid run!'
  if (ratio > 0) return 'Good effort — keep listening.'
  return 'Tough set. Try another run!'
}

type Props = { run: RunRecord; daily: number | null; onAgain: () => void; onHome: () => void }

export function Summary({ run, daily, onAgain, onHome }: Props) {
  const [copied, setCopied] = useState(false)
  const max = MAX_POINTS * run.results.length

  async function share() {
    const line = run.results.map((r) => `${square(r.points, r.outcome === 'skipped')} ${r.outcome === 'skipped' ? 'skip' : formatSeconds(r.seconds)}`).join('\n')
    const head = daily ? `Praise Play · Day #${daily}` : 'Praise Play'
    const text = `${head}\n${formatPoints(run.total)} / ${formatPoints(max)}\n${line}\n${location.origin}${location.pathname}`
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 2000) }
    } catch {
      // Sharing was cancelled.
    }
  }

  return (
    <section className="card summary">
      <p className="eyebrow">{daily ? `Day #${daily} complete` : 'Run complete'}</p>
      <div className="total"><strong>{formatPoints(run.total)}</strong><span>/ {formatPoints(max)}</span></div>
      <p className="summary-verdict">{verdict(run.total, max)}</p>
      <ol className="result-list">
        {run.results.map((result, i) => {
          const song = songById.get(result.songId)
          return (
            <li key={i}>
              <span className="sq">{square(result.points, result.outcome === 'skipped')}</span>
              <span className="result-song"><strong>{song?.title}</strong><span>{song?.artist}</span></span>
              <span className="result-pts">
                <strong>{result.outcome === 'skipped' ? '—' : formatPoints(result.points)}</strong>
                <span>{result.outcome === 'skipped' ? 'skipped' : `${formatSeconds(result.seconds)}${result.wrongGuesses ? ` · ${result.wrongGuesses}✕` : ''}`}</span>
              </span>
            </li>
          )
        })}
      </ol>
      <div className="summary-actions">
        <button className="primary" onClick={share}>{copied ? 'Copied!' : 'Share'}</button>
        <button className="secondary" onClick={onAgain}>{daily ? 'Play a free run' : 'Play again'}</button>
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
