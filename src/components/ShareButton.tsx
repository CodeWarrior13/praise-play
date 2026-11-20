import { useEffect, useMemo, useRef, useState } from 'react'
import type { Catalog } from '../lib/catalog'
import { loadSetting, loadStats, saveSetting } from '../lib/storage'
import { christmasAvailable } from '../lib/seasonal'
import { CARD_STYLES, CHRISTMAS_CARD } from '../lib/shareRun'
import { INVITES, inviteCovers, inviteLink, inviteTitle, type Invite } from '../lib/invite'
import { InviteCard } from './InviteCard'
import { ShareActions } from './ShareActions'

type Props = { catalog: Catalog | null; christmas: Catalog | null }

/** Top-right button for inviting friends: opens the invite card picker. */
export function ShareButton({ catalog, christmas }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="icon-button" onClick={() => setOpen(true)} aria-label="Invite friends to play" title="Invite friends" disabled={!catalog}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7c0 .3 0 .5.1.8L8.4 11.2a3 3 0 1 0 0 1.6l6.7 3.4A3 3 0 1 0 18 16Z" /></svg>
      </button>
      {open && catalog && <InviteDialog catalog={christmas ?? catalog} christmas={Boolean(christmas)} onClose={() => setOpen(false)} />}
    </>
  )
}

function InviteDialog({ catalog, christmas, onClose }: { catalog: Catalog; christmas: boolean; onClose: () => void }) {
  const best = loadStats().best
  const [color, setColor] = useState(() => (christmas ? CHRISTMAS_CARD : loadSetting<number>('cardColor', 0)))
  const [name, setName] = useState(() => loadSetting('playerName', ''))
  const [showBest, setShowBest] = useState(best > 0)
  const [pick, setPick] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const covers = useMemo(() => inviteCovers(catalog.songs, 6), [catalog])
  const invite: Invite = { name: name.trim() || undefined, color, best: showBest ? best : 0, christmas }
  const link = inviteLink(invite)
  const message = INVITES[pick]

  useEffect(() => {
    ref.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  function pickColor(index: number) {
    setColor(index)
    saveSetting('cardColor', index)
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="help-dialog share-card-dialog invite-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-title" ref={ref} tabIndex={-1}>
        <div className="help-head">
          <div>
            <p className="eyebrow">Invite friends</p>
            <h2 id="invite-title">Pick a card style</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="card-swatches" role="radiogroup" aria-label="Card colour">
          {CARD_STYLES.map((style, i) => (style.seasonal && !christmasAvailable() ? null : (
            <button key={style.id} role="radio" aria-checked={color === i} aria-label={style.name} title={style.name} className={`card-swatch${color === i ? ' active' : ''}`} style={{ background: style.id === 'theme' ? 'linear-gradient(150deg, #6a2fd6, #b8327f)' : style.bg }} onClick={() => pickColor(i)} />
          )))}
        </div>

        {/* What it looks like in a text: the card, then the title and site, like Messages and WhatsApp show it. */}
        <div className="link-bubble">
          <InviteCard invite={invite} covers={covers} />
          <div className="link-bubble-text">
            <strong>{inviteTitle(invite)}</strong>
            <span>{location.host}</span>
          </div>
        </div>

        <div className="invite-options">
          <label className="invite-name">
            <span>Your name on the card</span>
            <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
          </label>
          {best > 0 && (
            <label className="invite-best">
              <input type="checkbox" checked={showBest} onChange={(e) => setShowBest(e.target.checked)} />
              <span>Show my best ({best.toLocaleString('en-US')})</span>
            </label>
          )}
        </div>
        <button className="invite-message" onClick={() => setPick((p) => (p + 1) % INVITES.length)} title="Tap for another message">
          <span>“{message}”</span>
          <small>↻ Another message</small>
        </button>

        <ShareActions link={link} message={message} imageUrl={(size) => imageUrl(link, size)} fileName="praise-play-invite" onBeforeShare={() => saveSetting('playerName', name.trim())} />
      </div>
    </div>
  )
}

const imageUrl = (link: string, size: 'link' | 'story') => {
  const url = new URL(link)
  return `${url.origin}/api/card?i=${encodeURIComponent(url.searchParams.get('i') ?? '')}&size=${size}`
}
