import { useEffect, useRef, useState } from 'react'

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Tweens a number toward `value` so scores roll rather than jump. */
export function CountUp({ value, duration = 700, format = (n: number) => n.toLocaleString('en-US') }: { value: number; duration?: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (reducedMotion()) { setShown(value); from.current = value; return }
    const start = performance.now()
    const begin = from.current
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = Math.round(begin + (value - begin) * eased)
      setShown(next)
      from.current = next
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])
  return <>{format(shown)}</>
}

/** A one-shot burst of confetti from the centre of its parent. */
export function Confetti({ count = 42 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * 360 + Math.random() * 20,
      distance: 90 + Math.random() * 140,
      delay: Math.random() * 80,
      size: 5 + Math.random() * 6,
      hue: i % 3,
      spin: Math.random() * 720 - 360,
    })),
  )
  if (reducedMotion()) return null
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`c${p.hue}`}
          style={{
            '--x': `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
            '--y': `${Math.sin((p.angle * Math.PI) / 180) * p.distance - 40}px`,
            '--r': `${p.spin}deg`,
            width: p.size,
            height: p.size * 0.6,
            animationDelay: `${p.delay}ms`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

/** Slow-moving glow blobs behind the whole app. */
export function Backdrop() {
  return (
    <div className="backdrop-fx" aria-hidden="true">
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
      <span className="grain" />
    </div>
  )
}

/** Animated equalizer bars, used while audio plays. */
export function Equalizer({ active }: { active: boolean }) {
  return (
    <span className={`eq${active ? ' on' : ''}`} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  )
}
