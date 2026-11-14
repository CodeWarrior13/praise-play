import { useEffect, useMemo, useRef, useState } from 'react'

/** A few friendly challenges; one is picked each time the share button is opened. */
const INVITES = [
  'You say you’re good at music? Let’s find out. 🎵 Name the Christian song from 0.1 seconds:',
  'Hey, come play Praise Play with me! How fast can you name the song? 🎶',
  'Think you know your worship music? Prove it. 0.1 seconds is all you get. 😏',
  'I bet you can’t beat my score. Come play Praise Play! 🏆',
  'Quick, name that song! Come play Praise Play with me 🎧',
]

const playLink = () => `${location.origin}${location.pathname}`

/** Top-right button for inviting friends to the game. */
export function ShareButton() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pick, setPick] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const message = useMemo(() => INVITES[pick], [pick])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  async function share() {
    const next = Math.floor(Math.random() * INVITES.length)
    setPick(next)
    setCopied(false)
    // Phones: the built-in share sheet (Messages, Snapchat, Instagram…).
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: 'Praise Play', text: INVITES[next], url: playLink() })
        return
      } catch {
        // Cancelled, or not allowed here: fall back to the popup.
      }
    }
    setOpen((v) => !v)
  }

  async function copy() {
    const text = `${message} ${playLink()}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.prompt('Copy this invite:', text)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="share-picker" ref={ref}>
      <button className="icon-button" onClick={share} aria-label="Invite friends to play" title="Invite friends" aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7c0 .3 0 .5.1.8L8.4 11.2a3 3 0 1 0 0 1.6l6.7 3.4A3 3 0 1 0 18 16Z" /></svg>
      </button>
      {open && (
        <div className="share-menu" role="dialog" aria-label="Invite friends">
          <p className="share-title">Invite friends</p>
          <p className="share-message">“{message}”</p>
          <p className="share-url">{playLink().replace(/^https?:\/\//, '')}</p>
          <div className="share-row">
            <button className="primary" onClick={copy}>{copied ? '✓ Copied!' : 'Copy invite'}</button>
            <button className="ghost" onClick={() => setPick((p) => (p + 1) % INVITES.length)} title="Pick another message">↻ New line</button>
          </div>
        </div>
      )}
    </div>
  )
}
