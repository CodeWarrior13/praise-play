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
            <li key={i} className={hint.kind === 'cover' ? 'cover-hint' : undefined}>
              {hint.kind === 'cover'
                ? <img src={hint.cover} alt="Album cover hint" width={72} height={72} />
                : <span className="hint-bulb" aria-hidden="true">💡</span>}
              {hint.text}
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
