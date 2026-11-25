import { MAX_CLIP, MIN_CLIP } from './scoring'

/**
 * The sound wave drawn on the clip slider, measured from the preview itself.
 *
 * Each point is the loudness of a short slice (25 ms) of the song, so beats show
 * as sharp peaks and the gaps between them as valleys.
 * - `log` follows the round's slider (0.1s … 30s, logarithmic), starting where the
 *   music starts (the skipped intro is left out).
 * - `linear` covers the whole preview evenly, for the answer screen.
 */
export type Wave = { log: number[]; linear: number[] }

const SLICE = 0.025

function loudness(data: Float32Array, sampleRate: number, at: number): number {
  const from = Math.max(0, Math.floor((at - SLICE / 2) * sampleRate))
  const to = Math.min(data.length, from + Math.max(1, Math.floor(SLICE * sampleRate)))
  let sum = 0
  for (let i = from; i < to; i++) sum += data[i] * data[i]
  return to > from ? Math.sqrt(sum / (to - from)) : 0
}

/** Stretches the values so quiet parts sit low and the loudest peaks reach the top. */
function shape(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const low = sorted[Math.floor(sorted.length * 0.04)]
  const high = sorted[Math.floor(sorted.length * 0.995)] || 1
  const span = high - low || 1
  return values.map((v) => Math.round(Math.max(0.04, Math.min(1, Math.max(0, (v - low) / span) ** 1.45)) * 1000) / 1000)
}

export function measureWave(data: Float32Array, sampleRate: number, startSeconds: number): Wave {
  const duration = data.length / sampleRate
  const logEnd = Math.max(MIN_CLIP * 2, Math.min(MAX_CLIP, duration - startSeconds))
  const range = Math.log(logEnd / MIN_CLIP)
  const LOG_POINTS = 340
  const log = Array.from({ length: LOG_POINTS }, (_, i) => loudness(data, sampleRate, startSeconds + MIN_CLIP * Math.exp((i / (LOG_POINTS - 1)) * range)))
  const linearEnd = Math.min(MAX_CLIP, duration)
  const LINEAR_POINTS = 260
  const linear = Array.from({ length: LINEAR_POINTS }, (_, i) => loudness(data, sampleRate, (i / (LINEAR_POINTS - 1)) * linearEnd))
  return { log: shape(log), linear: shape(linear) }
}
