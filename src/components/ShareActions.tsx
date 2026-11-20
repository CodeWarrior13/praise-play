import { useEffect, useRef, useState } from 'react'

type Props = {
  /** The link friends open (/s?r=… or /s?i=…): its preview shows the card in Messages, WhatsApp, email… */
  link: string
  /** The message that goes with it. */
  message: string
  /** Where the card picture lives (wide for chats, tall for stories). */
  imageUrl: (size: 'link' | 'story') => string
  /** Download name, e.g. praise-play-score */
  fileName: string
  /** Called before sharing (e.g. to save the player's name). */
  onBeforeShare?: () => void
}

type Picture = { link: string; size: 'link' | 'story'; file: File }

/**
 * Spotify-style sharing: the main Share button sends the card picture *and* the
 * link together (the friend sees the card and taps the link to play), plus a
 * row of apps underneath. The pictures are fetched ahead of time so the share
 * sheet opens instantly (phones only allow sharing right after a tap).
 */
export function ShareActions({ link, message, imageUrl, fileName, onBeforeShare }: Props) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<null | 'card' | 'story'>(null)
  const [failed, setFailed] = useState(false)
  const pictures = useRef<Map<string, Promise<Picture | null>>>(new Map())
  const text = `${message} ${link}`
  const phone = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

  function picture(size: 'link' | 'story') {
    const key = `${size}|${link}`
    let found = pictures.current.get(key)
    if (!found) {
      found = fetch(imageUrl(size))
        .then(async (response) => {
          if (!response.ok) throw new Error(String(response.status))
          const file = new File([await response.blob()], `${fileName}${size === 'story' ? '-story' : ''}.jpg`, { type: 'image/jpeg' })
          return { link, size, file }
        })
        .catch(() => { pictures.current.delete(key); return null })
      pictures.current.set(key, found)
    }
    return found
  }

  // Get the card picture ready while the player picks a colour.
  useEffect(() => {
    const timer = window.setTimeout(() => { void picture('link'); if (phone) void picture('story') }, 700)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link])

  async function copy() {
    onBeforeShare?.()
    try { await navigator.clipboard.writeText(text) } catch { window.prompt('Copy this:', text) }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  /** The card picture + message + link in one go, through the phone's share sheet. */
  async function share(size: 'link' | 'story') {
    onBeforeShare?.()
    setFailed(false)
    setBusy(size === 'link' ? 'card' : 'story')
    try {
      const pic = await picture(size)
      if (pic && navigator.canShare?.({ files: [pic.file] })) {
        await navigator.share({ files: [pic.file], text, title: 'Praise Play' })
      } else if (size === 'story' && pic) {
        download(pic.file)
      } else if (navigator.share && phone) {
        await navigator.share({ title: 'Praise Play', text: message, url: link })
      } else {
        await copy()
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  const enc = encodeURIComponent
  const apps: { id: string; label: string; href: string; icon: string }[] = [
    { id: 'sms', label: 'Messages', href: `sms:?&body=${enc(text)}`, icon: '💬' },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${enc(text)}`, icon: 'whatsapp' },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`, icon: 'facebook' },
    { id: 'x', label: 'X', href: `https://x.com/intent/post?text=${enc(message)}&url=${enc(link)}`, icon: 'x' },
    { id: 'email', label: 'Email', href: `mailto:?subject=${enc('Praise Play')}&body=${enc(text)}`, icon: '✉️' },
  ]

  return (
    <div className="share-actions">
      <button className="primary big wide shine" onClick={() => share('link')} disabled={busy !== null}>
        {busy === 'card' ? <><span className="spinner small" /> Getting your card…</> : 'Share'}
      </button>
      <div className="share-apps" role="list">
        <button role="listitem" className="share-app" onClick={copy}>
          <span className="share-app-icon">{copied ? '✓' : <LinkIcon />}</span>{copied ? 'Copied!' : 'Copy link'}
        </button>
        {apps.map((app) => (
          <a key={app.id} role="listitem" className={`share-app app-${app.id}`} href={app.href} target={app.id === 'sms' || app.id === 'email' ? undefined : '_blank'} rel="noopener noreferrer" onClick={() => onBeforeShare?.()}>
            <span className="share-app-icon">{['whatsapp', 'facebook', 'x'].includes(app.icon) ? <AppIcon id={app.icon} /> : app.icon}</span>{app.label}
          </a>
        ))}
        <button role="listitem" className="share-app" onClick={() => share('story')} disabled={busy !== null}>
          <span className="share-app-icon story">{busy === 'story' ? <span className="spinner small" /> : '📸'}</span>Story
        </button>
      </div>
      {failed && <p className="share-failed">Couldn’t open sharing. Try Copy link.</p>}
    </div>
  )
}

function download(file: File) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = file.name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a1 1 0 1 1 1.4 1.4L12 13.4a1 1 0 0 1-1.4 0Zm-2.8 5.7a4 4 0 0 1-2.9-6.8l2.1-2.1a1 1 0 0 1 1.4 1.4l-2.1 2.1a2 2 0 1 0 2.9 2.8l2.1-2.1a1 1 0 0 1 1.4 1.4l-2.1 2.1a4 4 0 0 1-2.8 1.2Zm7.8-6.4a1 1 0 0 1-.7-1.7l2.1-2.1a2 2 0 1 0-2.9-2.8L12 8.2a1 1 0 0 1-1.4-1.4l2.1-2.1a4 4 0 1 1 5.7 5.6l-2.1 2.1a1 1 0 0 1-.7.3Z" /></svg>
)

function AppIcon({ id }: { id: string }) {
  if (id === 'whatsapp') return <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.6-1.3.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" /></svg>
  if (id === 'facebook') return <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" /></svg>
  return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" /></svg>
}
