import { useEffect, useMemo, useRef, useState } from 'react'
import type { Catalog } from '../lib/catalog'
import { loadSetting, saveSetting, type RunRecord } from '../lib/storage'
import { christmasAvailable } from '../lib/seasonal'
import { CARD_STYLES, CHRISTMAS_CARD, cardImageUrl, shareLink, shareMessage, type SharedRun } from '../lib/shareRun'
import { ResultsCard } from './ResultsCard'

type Props = { run: RunRecord; mode: string; catalog: Catalog; christmas?: boolean; onClose: () => void }

/**
 * Share dialog: pick a colour for the results card (like Spotify's embed
 * colours), see exactly what friends will see, then share or copy the link.
 */
export function ShareCard({ run, mode, catalog, christmas = false, onClose }: Props) {
  const [color, setColor] = useState(() => christmas ? CHRISTMAS_CARD : loadSetting<number>('cardColor', 0))
  const [copied, setCopied] = useState(false)
  const [imageState, setImageState] = useState<'idle' | 'making' | 'saved' | 'failed'>('idle')
  const ref = useRef<HTMLDivElement>(null)
  const name = loadSetting('playerName', '') || undefined
  const shared: SharedRun = useMemo(() => ({ name, mode, total: run.total, results: run.results, color, christmas }), [name, mode, run, color, christmas])

  useEffect(() => {
    ref.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  function pick(index: number) {
    setColor(index)
    saveSetting('cardColor', index)
  }

  async function send(copyOnly: boolean) {
    const text = shareMessage(run.total, name)
    const url = shareLink(run, mode, name, color, christmas)
    try {
      if (!copyOnly && navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: 'Praise Play', text, url }); return }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sharing was cancelled.
    }
  }

  /** Stories (Instagram, TikTok, Facebook, Snapchat) take pictures, not links: share the card as an image. */
  async function sendImage() {
    setImageState('making')
    const url = shareLink(run, mode, name, color, christmas)
    try {
      const response = await fetch(cardImageUrl(url, 'story'))
      if (!response.ok) throw new Error(String(response.status))
      const file = new File([await response.blob()], 'praise-play-score.jpg', { type: 'image/jpeg' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${shareMessage(run.total, name)} ${url}` })
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(file)
        a.download = file.name
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(a.href), 4000)
      }
      setImageState('saved')
    } catch (error) {
      setImageState((error as Error).name === 'AbortError' ? 'idle' : 'failed')
    }
    window.setTimeout(() => setImageState('idle'), 2500)
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
        <p className="muted small share-caption">Friends get “{shareMessage(run.total, name)}” and a link that shows this card in Messages, WhatsApp, email and more.</p>
        <div className="summary-actions">
          <button className="primary shine" onClick={() => send(false)}>{copied ? 'Copied!' : 'Share'}</button>
          <button className="ghost" onClick={() => send(true)}>Copy link</button>
        </div>
        <button className="text-button share-image" onClick={sendImage} disabled={imageState === 'making'}>
          {imageState === 'making' ? 'Making your image…' : imageState === 'saved' ? 'Done ✓' : imageState === 'failed' ? 'Couldn’t make the image, try again' : '📸 Share as image (Instagram, TikTok, Facebook stories)'}
        </button>
      </div>
    </div>
  )
}
