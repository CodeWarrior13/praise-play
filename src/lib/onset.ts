/**
 * Finds where the music actually starts in a preview, so clips don't open on
 * seconds of near-silence. Works on mono PCM samples (-1..1).
 *
 * The track's own loudness sets the bar: the start is the first 50 ms window
 * that reaches 20% of the track’s typical loud level (90th percentile), or an
 * absolute floor for very quiet recordings. We back up a little so the first
 * note isn't clipped.
 */
export const ONSET_LEAD = 0.12
const WINDOW = 0.05
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
  const threshold = Math.max(loud * 0.2, 0.004) // 0.004 ≈ -48 dBFS
  const first = rms.findIndex((value) => value >= threshold)
  if (first < 0) return 0
  const seconds = first * WINDOW - ONSET_LEAD
  return seconds < 0.25 ? 0 : Math.min(MAX_SKIP, Math.round(seconds * 100) / 100)
}
