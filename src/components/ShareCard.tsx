import { useEffect, useMemo, useRef, useState } from 'react'
import type { Catalog } from '../lib/catalog'
import { loadSetting, saveSetting, type RunRecord } from '../lib/storage'
import { christmasAvailable } from '../lib/seasonal'
import { CARD_STYLES, CHRISTMAS_CARD, cardImageUrl, shareLink, shareMessage, type SharedRun } from '../lib/shareRun'
import { ResultsCard } from './ResultsCard'
import { ShareActions } from './ShareActions'

type Props = { run: RunRecord; mode: string; catalog: Catalog; christmas?: boolean; onClose: () => void }

/**
 * Share dialog: pick a colour for the results card (like Spotify's embed
 * colours), see exactly what friends will see, then share or copy the link.
 */
export function ShareCard({ run, mode, catalog, christmas = false, onClose }: Props) {
  const [color, setColor] = useState(() => christmas ? CHRISTMAS_CARD : loadSetting<number>('cardColor', 0))
  const ref = useRef<HTMLDivElement>(null)
  const name = loadSetting('playerName', '') || undefined
  const shared: SharedRun = useMemo(() => ({ name, mode, total: run.total, results: run.results, color, christmas }), [name, mode, run, color, christmas])

  useEffect(() => {
    ref.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const link = useMemo(() => shareLink(run, mode, name, color, christmas), [run, mode, name, color, christmas])

  function pick(index: number) {
    setColor(index)
    saveSetting('cardColor', index)
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="help-dialog share-card-dialog" role="dialog" aria-modal="true" aria-labelledby="share-card-title" ref={ref} tabIndex={-1}>
        <div className="help-head">
          <div>
            <p className="eyebrow">Share your score</p>
            <h2 id="share-card-title">Pick a card style</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="card-swatches" role="radiogroup" aria-label="Card colour">
          {CARD_STYLES.map((style, i) => (style.seasonal && !christmasAvailable() ? null : (
            <button
              key={style.id}
              role="radio"
              aria-checked={color === i}
              aria-label={style.name}
              title={style.name}
              className={`card-swatch${color === i ? ' active' : ''}`}
              style={{ background: style.bg }}
              onClick={() => pick(i)}
            />
          )))}
        </div>
        <div className="share-preview">
          <ResultsCard key={color} shared={shared} catalog={catalog} color={color} />
        </div>
        <p className="muted small share-caption">Friends get your card with “{shareMessage(run.total, name)}” and a link that opens it in the game.</p>
        <ShareActions link={link} message={shareMessage(run.total, name)} imageUrl={(size) => cardImageUrl(link, size)} fileName="praise-play-score" />
      </div>
    </div>
  )
}
