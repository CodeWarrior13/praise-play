import { useId, useMemo } from 'react'

type Props = {
  /** Loudness points, 0..1, evenly spaced across the slider. */
  points: number[]
  /** How much of the slider is unlocked (0..1). */
  unlocked: number
  /** How much has played so far (0..1). */
  played: number
}

const W = 1000
const H = 100
const MID = H / 2

/**
 * A sharp, mirrored sound wave in flat theme colours:
 * played = the theme colour, unlocked but not played yet = a softer version,
 * locked = grey (you can see the song's shape, not hear it).
 */
export function Waveform({ points, unlocked, played }: Props) {
  const id = useId().replace(/:/g, '')
  const path = useMemo(() => {
    const last = points.length - 1 || 1
    const top = points.map((v, i) => `${((i / last) * W).toFixed(1)},${(MID - v * MID * 0.98).toFixed(1)}`)
    const bottom = points.map((v, i) => `${((i / last) * W).toFixed(1)},${(MID + v * MID * 0.98).toFixed(1)}`).reverse()
    return `M0,${MID} L${top.join(' L')} L${W},${MID} L${bottom.join(' L')} Z`
  }, [points])
  const u = Math.max(0, Math.min(1, unlocked)) * W
  const p = Math.max(0, Math.min(1, played)) * W

  return (
    <svg className="waveform" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <clipPath id={`${id}l`}><rect x={u} y="0" width={W} height={H} /></clipPath>
        <clipPath id={`${id}u`}><rect x="0" y="0" width={u} height={H} /></clipPath>
        <clipPath id={`${id}p`}><rect x="0" y="0" width={p} height={H} /></clipPath>
      </defs>
      <path className="wave-locked" d={path} clipPath={`url(#${id}l)`} />
      <path className="wave-unlocked" d={path} clipPath={`url(#${id}u)`} />
      {p > 0 && <path className="wave-played" d={path} clipPath={`url(#${id}p)`} />}
    </svg>
  )
}
