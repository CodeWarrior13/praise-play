import { HINT_COSTS, formatPoints } from '../lib/scoring'
import type { Hint } from '../lib/hints'

type Props = { hints: Hint[]; used: number; onTake: () => void; disabled?: boolean }

/** Optional clues. Nothing shows until the player asks, and each one costs more. */
export function HintBox({ hints, used, onTake, disabled = false }: Props) {
  const next = used < hints.length ? HINT_COSTS[used] : null
  return (
    <div className="hint-box">
      {used > 0 && (
        <ol className="hint-list">
          {hints.slice(0, used).map((hint, i) => (
            <li key={i} className={`hint-${hint.kind}`}>
              {hint.kind === 'cover' ? (
                <span className="hint-sleeve" aria-hidden="true"><img src={hint.cover} alt="" width={96} height={96} /><i /></span>
              ) : hint.kind === 'year' ? (
                <span className="hint-calendar" aria-hidden="true"><b>’{String(hint.year).slice(-2)}</b></span>
              ) : (
                <span className="hint-bulb" aria-hidden="true">{hint.kind === 'genre' ? '🎧' : '💡'}</span>
              )}
              <span className="hint-text">
                {hint.kind === 'year' ? <><small>Released in</small><strong>{hint.year}</strong></>
                  : hint.kind === 'genre' ? <><small>Genre</small><strong>{hint.genre}</strong></>
                  : hint.kind === 'cover' ? <><small>Hint</small><strong>The album cover</strong></>
                  : hint.text}
              </span>
              <span className="hint-cost">−{formatPoints(HINT_COSTS[i])}</span>
            </li>
          ))}
        </ol>
      )}
      {next !== null && (
        <button className="hint-button" onClick={onTake} disabled={disabled}>
          <span aria-hidden="true">💡</span> {used ? 'Another hint' : 'Need a hint?'} <span className="hint-price">−{formatPoints(next)}</span>
        </button>
      )}
    </div>
  )
}
