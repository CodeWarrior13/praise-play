import { useEffect, useState } from 'react'

/**
 * Opening animation, drawn in the current theme's colours: the record spins in,
 * sound rings pulse out, notes drift up, the wordmark arrives letter by letter
 * with a light sweep, and the bar fills. About 3 seconds in all, fade included (and
 * until the song catalog is ready), then fades away.
 */
const MIN_MS = 2300

export function Splash({ ready }: { ready: boolean }) {
  const [minDone, setMinDone] = useState(false)
  const [gone, setGone] = useState(false)
  const leaving = ready && minDone

  useEffect(() => {
    const timer = window.setTimeout(() => setMinDone(true), MIN_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(() => setGone(true), 650)
    return () => window.clearTimeout(timer)
  }, [leaving])

  if (gone) return null
  return (
    <div className={`splash${leaving ? ' leaving' : ''}`} role="status" aria-label="Loading Praise Play">
      <div className="splash-glow" aria-hidden="true" />
      <div className="splash-floaters" aria-hidden="true">
        {['♪', '♫', '♪', '♬', '♫', '♪'].map((note, i) => <span key={i} style={{ '--i': i } as React.CSSProperties}>{note}</span>)}
      </div>
      <div className="splash-mark" aria-hidden="true">
        <span className="splash-ring r1" />
        <span className="splash-ring r2" />
        <span className="splash-ring r3" />
        <div className="splash-disc"><span /></div>
        <svg className="splash-note" viewBox="0 0 64 64">
          <path fill="currentColor" d="M27 8h6v32.5a9 9 0 1 1-6-8.5V8Zm6 0 13 7v9l-13-6.5V8Z" />
          <path fill="currentColor" d="M50 6l1.6 4.4L56 12l-4.4 1.6L50 18l-1.6-4.4L44 12l4.4-1.6L50 6Z" />
        </svg>
      </div>
      <h1 className="splash-word">
        {'praise'.split('').map((c, i) => <span key={`a${i}`} style={{ animationDelay: `${650 + i * 60}ms` }}>{c}</span>)}
        <b>{'play'.split('').map((c, i) => <span key={`b${i}`} style={{ animationDelay: `${1010 + i * 60}ms` }}>{c}</span>)}</b>
        <i className="splash-sheen" aria-hidden="true" />
      </h1>
      <p className="splash-tag">name the song from 0.1 seconds</p>
      <div className="splash-bar" aria-hidden="true"><span /></div>
    </div>
  )
}
