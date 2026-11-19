/** A string of twinkling lights across the top of the page, plus gentle snow. Christmas mode only. */
const COLORS = ['#ff3b4e', '#ffd34d', '#3ddc84', '#4db8ff', '#ff8ad8']

export function ChristmasLights() {
  const bulbs = 22
  return (
    <div className="xmas-lights" aria-hidden="true">
      <svg className="xmas-wire" viewBox="0 0 1000 40" preserveAspectRatio="none">
        <path d={Array.from({ length: bulbs }, (_, i) => {
          const x0 = (i / bulbs) * 1000
          const x1 = ((i + 1) / bulbs) * 1000
          return `${i ? '' : 'M0 6 '}Q ${(x0 + x1) / 2} 30 ${x1} 6`
        }).join(' ')} />
      </svg>
      <div className="xmas-row">
        {Array.from({ length: bulbs }, (_, i) => (
          <span key={i} className="xmas-bulb" style={{ '--c': COLORS[i % COLORS.length], '--d': `${(i * 0.37) % 2.4}s` } as React.CSSProperties} />
        ))}
      </div>
      <div className="xmas-snow">
        {Array.from({ length: 28 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.83) % 12}s`, animationDuration: `${9 + (i % 6) * 1.7}s`, opacity: 0.35 + (i % 4) * 0.15, width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2 }} />
        ))}
      </div>
    </div>
  )
}
