/**
 * Finds where a preview's main part begins, so the 0.1s clip lands on something
 * recognisable instead of silence or an instrumental intro.
 *
 * Works on mono PCM samples (-1..1) in 50 ms windows. The track's own loudness
 * sets the bar (its 90th-percentile level): the main part starts at the first
 * moment the next 1.5 seconds average at least 55% of that level. If a track
 * never gets there, it falls back to the first clearly audible moment (20%).
 * We back up slightly so the first beat isn't clipped, and never skip more than
 * 15 seconds, so plenty of the 30-second preview is left to unlock.
 */
export const ONSET_LEAD = 0.12
const WINDOW = 0.05
const SPAN = 30 // windows = 1.5 s
const MAX_SKIP = 15

export function findOnset(samples: Float32Array, sampleRate: number): number {
  const size = Math.max(1, Math.round(sampleRate * WINDOW))
  const rms: number[] = []
  for (let i = 0; i + size <= samples.length; i += size) {
    let sum = 0
    for (let j = i; j < i + size; j++) sum += samples[j] * samples[j]
    rms.push(Math.sqrt(sum / size))
  }
  if (!rms.length) return 0
  const sorted = [...rms].sort((a, b) => a - b)
  const loud = sorted[Math.floor(sorted.length * 0.9)]

  let index = -1
  let running = 0
  for (let i = 0; i < rms.length; i++) {
    running += rms[i]
    if (i >= SPAN) running -= rms[i - SPAN]
    if (i >= SPAN - 1 && running / SPAN >= loud * 0.55) { index = i - SPAN + 1; break }
  }
  if (index < 0) index = rms.findIndex((value) => value >= Math.max(loud * 0.2, 0.004))
  if (index <= 0) return 0
  const seconds = index * WINDOW - ONSET_LEAD
  return seconds < 0.25 ? 0 : Math.min(MAX_SKIP, Math.round(seconds * 100) / 100)
}
