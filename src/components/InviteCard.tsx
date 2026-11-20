import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { artUrl, type Song } from '../lib/catalog'
import { CARD_STYLES } from '../lib/shareRun'
import { inviteLine, type Invite } from '../lib/invite'

/**
 * The invite card exactly as friends see it under the link (it mirrors the
 * picture drawn by netlify/lib/card.ts, 1200×630), scaled to fit.
 */
export function InviteCard({ invite, covers }: { invite: Invite; covers: Song[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)
  // Measure before the first paint, so the card never shows at the wrong size.
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(el.clientWidth / 1200)
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const style = CARD_STYLES[invite.color] ?? CARD_STYLES[0]
  const dark = style.ink === 'dark'
  const christmas = style.id === 'christmas' || invite.christmas
  const ink = dark ? '#1d1420' : '#ffffff'
  const soft = dark ? 'rgba(29,20,32,.7)' : 'rgba(255,255,255,.8)'
  const faint = dark ? 'rgba(29,20,32,.45)' : 'rgba(255,255,255,.5)'
  const bars = [10, 22, 34, 18, 40, 26, 14, 30, 38, 20, 12, 28, 36, 16, 24, 32, 18, 10, 26, 34, 14, 22, 30, 12]
  const play = (size: number, color: string) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fill={color} d="M7 4.5v15l12.5-7.5L7 4.5Z" /></svg>
  const row: CSSProperties = { display: 'flex', alignItems: 'center' }

  return (
    <div className="invite-card" ref={box} style={{ height: 630 * scale }}>
      <div
        className="invite-canvas"
        style={{ width: 1200, height: 630, transform: `scale(${scale})`, background: style.id === 'theme' ? 'linear-gradient(150deg, #6a2fd6 0%, #b8327f 55%, #2a0f5c 100%)' : style.bg, color: ink }}
        data-christmas={christmas || undefined}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 470, gap: 12 }}>
          <div style={{ ...row, gap: 10, padding: '9px 18px', borderRadius: 999, border: `2px solid ${dark ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.3)'}`, color: soft, fontSize: 20, fontWeight: 800, letterSpacing: 3 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill={soft} d="M9 18.5a3 3 0 1 1-2-2.83V5.5l12-2.5v12a3 3 0 1 1-2-2.83V7.6l-8 1.7v9.2Z" /></svg>
            {christmas ? 'PRAISE PLAY · CHRISTMAS' : 'PRAISE PLAY'}
          </div>
          <div style={{ height: 4 }} />
          <div style={{ color: soft, fontSize: 30, fontWeight: 800 }}>{invite.name ? `${invite.name} challenged you` : 'You’re invited'}</div>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 700, fontSize: 62, lineHeight: 1.04, letterSpacing: -2 }}>Name the song<br />in 0.1 seconds</div>
          <div style={{ color: soft, fontSize: 22, fontWeight: 700 }}>{inviteLine(invite)}</div>
          <div style={{ height: 6 }} />
          <div style={{ ...row, gap: 12, padding: '14px 26px', borderRadius: 999, background: dark ? '#1d1420' : '#fff', color: dark ? '#fff' : '#2a0f5c', fontSize: 22, fontWeight: 800 }}>
            {play(20, dark ? '#fff' : '#2a0f5c')} Play Praise Play
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 168px)', gap: 14 }}>
            {covers.map((song) => <img key={song.id} src={artUrl(song, 250)} alt="" width={168} height={168} style={{ borderRadius: 16, objectFit: 'cover', display: 'block' }} onLoad={(e) => e.currentTarget.classList.add('loaded')} ref={(el) => { if (el?.complete) el.classList.add('loaded') }} />)}
          </div>
          <div style={{ ...row, gap: 16, padding: '14px 20px', borderRadius: 999, background: dark ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.26)', width: 532, boxSizing: 'border-box' }}>
            <div style={{ ...row, justifyContent: 'center', width: 48, height: 48, borderRadius: 999, background: dark ? '#1d1420' : '#fff', flexShrink: 0 }}>{play(22, dark ? '#fff' : '#2a0f5c')}</div>
            <div style={{ ...row, justifyContent: 'space-between', flexGrow: 1 }}>
              {bars.map((b, i) => <i key={i} className={i < 2 ? 'invite-bar on' : 'invite-bar'} style={{ width: 6, height: b, borderRadius: 9, background: i < 2 ? ink : faint, animationDelay: `${i * 70}ms` }} />)}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginLeft: 6 }}>0.1s</div>
          </div>
        </div>
      </div>
    </div>
  )
}
