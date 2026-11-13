import { useEffect, useRef } from 'react'
import { MAX_POINTS, RUN_LENGTH, WRONG_GUESS_PENALTY, clipWorth, formatPoints } from '../lib/scoring'
import { pauseAll, resumeAll } from '../lib/pause'

const KEYS: [string, string][] = [
  ['Space', 'Play / stop the clip'],
  ['A  ←', 'Replay (tap once)'],
  ['D  →', 'Unlock one more second (tap once)'],
  ['A–Z', 'Just start typing to search'],
  ['↑ ↓  Enter', 'Pick a search result'],
  ['H', 'Open or close this help (tap once)'],
  ['Esc', 'Close'],
]

/** "How to play" overlay. Everything behind it (audio, the answer timer) pauses while it's open. */
export function HelpDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<Element | null>(null)

  useEffect(() => {
    returnFocus.current = document.activeElement
    pauseAll()
    dialogRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'h') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      } else if (event.key === ' ' && event.target === dialogRef.current) {
        event.preventDefault() // Nothing to play while paused.
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      resumeAll()
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus()
    }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" ref={dialogRef} tabIndex={-1}>
        <div className="help-head">
          <div>
            <p className="eyebrow"><span className="pause-icon" aria-hidden="true">❚❚</span> Game paused</p>
            <h2 id="help-title">How to play</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close help">✕</button>
        </div>

        <ol className="help-steps">
          <li><span className="num">1</span><span>Press <strong>play</strong> to hear the first <strong>0.1 seconds</strong> of a song.</span></li>
          <li><span className="num">2</span><span>Need more? Drag the bar or tap <strong>0.5s</strong>, <strong>1s</strong>, <strong>3s</strong> or <strong>+1s</strong>, up to 30 seconds.</span></li>
          <li><span className="num">3</span><span>Search the <strong>song or artist</strong> and pick it from the list.</span></li>
          <li><span className="num">4</span><span>A wrong guess costs <strong>{WRONG_GUESS_PENALTY}</strong> points, but the song keeps going. <strong>Skip</strong> reveals it for 0.</span></li>
        </ol>

        <h3>What a song is worth</h3>
        <div className="worth-table">
          {[0.1, 0.5, 1, 3, 10, 30].map((t, i) => <div key={t} style={{ '--i': i } as React.CSSProperties}><span>{t}s</span><strong>{formatPoints(clipWorth(t))}</strong></div>)}
        </div>

        <h3>Ways to play</h3>
        <div className="mode-grid">
          <div><strong>▶ Play</strong><span>{RUN_LENGTH} songs, easy to legendary, out of {formatPoints(MAX_POINTS * RUN_LENGTH)}.</span></div>
          <div><strong>∞ Endless</strong><span>Songs keep coming and get harder. 3 lives; each skip costs one.</span></div>
          <div><strong>☀ Daily</strong><span>The same 5 songs for everyone today. One try.</span></div>
        </div>

        <h3>Keyboard</h3>
        <dl className="keys">
          {KEYS.map(([keys, action]) => (
            <div key={keys}>
              <dt>{keys.split('  ').map((k) => <kbd key={k}>{k}</kbd>)}</dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>

        <button className="primary wide" onClick={onClose}>Resume</button>
      </div>
    </div>
  )
}
