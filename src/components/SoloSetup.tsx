import { useEffect, useRef, useState } from 'react'
import { DIFFICULTIES, poolForDifficulty, type Difficulty } from '../lib/difficulty'
import type { Song } from '../lib/catalog'
import { pauseAll, resumeAll } from '../lib/pause'

export type SoloSettings = { count: number; difficulty: Difficulty }
export const SONG_COUNTS = [5, 7, 10]

type Props = {
  mode: 'run' | 'endless'
  pool: Song[]
  initial: SoloSettings
  onStart: (settings: SoloSettings) => void
  onClose: () => void
}

/** Pick how many songs and how hard, right before a solo game starts. */
export function SoloSetup({ mode, pool, initial, onStart, onClose }: Props) {
  const [count, setCount] = useState(initial.count)
  const [difficulty, setDifficulty] = useState<Difficulty>(initial.difficulty)
  const ref = useRef<HTMLDivElement>(null)
  const choice = DIFFICULTIES.find((d) => d.id === difficulty)!
  const available = poolForDifficulty(pool, difficulty).length

  useEffect(() => {
    pauseAll()
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); resumeAll() }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="help-dialog setup-dialog" role="dialog" aria-modal="true" aria-labelledby="setup-title" ref={ref} tabIndex={-1}>
        <div className="help-head">
          <div>
            <p className="eyebrow">{mode === 'endless' ? '∞ Endless' : '▶ Solo game'}</p>
            <h2 id="setup-title">{mode === 'endless' ? 'How hard?' : 'Set up your game'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {mode === 'run' && (
          <>
            <h3>Songs</h3>
            <div className="segmented three setup-count">
              {SONG_COUNTS.map((n) => (
                <button key={n} className={count === n ? 'active' : ''} onClick={() => setCount(n)}>
                  {n}<small>{n === 5 ? 'quick' : n === 7 ? 'standard' : 'marathon'}</small>
                </button>
              ))}
            </div>
          </>
        )}

        <h3>Difficulty</h3>
        <div className="setup-difficulty">
          {DIFFICULTIES.map((d) => (
            <button key={d.id} className={`diff-card diff-${d.id}${difficulty === d.id ? ' active' : ''}`} onClick={() => setDifficulty(d.id)}>
              <strong>{d.label}</strong>
              <span>{d.hint}</span>
            </button>
          ))}
        </div>

        <p className="muted small setup-note">
          {available.toLocaleString()} songs at {choice.label}.
          {mode === 'run' && (count === 5 && difficulty === 'mixed' ? ' This counts for the 🏆 leaderboard.' : ' Leaderboard scores come from 5-song Mixed games.')}
        </p>
        <button className="primary big wide shine" onClick={() => onStart({ count, difficulty })} disabled={available === 0} autoFocus>
          {mode === 'endless' ? 'Start Endless' : `Play ${count} songs`}
        </button>
      </div>
    </div>
  )
}
