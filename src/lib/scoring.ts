/** Shortest and longest clip, in seconds. */
export const MIN_CLIP = 0.1
export const MAX_CLIP = 30
export const MAX_POINTS = 10_000
export const MIN_POINTS = 3_000
export const WRONG_GUESS_PENALTY = 500
export const RUN_LENGTH = 5
export const DIFFICULTY = ['Easy', 'Medium', 'Hard', 'Expert', 'Legend']

const RANGE = Math.log(MAX_CLIP / MIN_CLIP)

/** Clip length → 0..1 position on the logarithmic scrubber. */
export function toPosition(seconds: number): number {
  return Math.min(1, Math.max(0, Math.log(seconds / MIN_CLIP) / RANGE))
}

/** 0..1 scrubber position → clip length, rounded to a sensible step. */
export function fromPosition(position: number): number {
  const raw = MIN_CLIP * Math.exp(Math.min(1, Math.max(0, position)) * RANGE)
  return roundClip(raw)
}

export function roundClip(seconds: number): number {
  const step = seconds < 1 ? 0.1 : seconds < 10 ? 0.5 : 1
  return Math.min(MAX_CLIP, Math.max(MIN_CLIP, Math.round(seconds / step) * step))
}

/**
 * What a song is worth if you name it with this much of the clip unlocked.
 * The curve drops fastest at the start, where the first moments hold the most clues.
 */
export function clipWorth(seconds: number): number {
  const x = toPosition(seconds)
  const points = MIN_POINTS + (MAX_POINTS - MIN_POINTS) * (1 - Math.pow(x, 0.55))
  return Math.round(points / 10) * 10
}

/** What each hint costs, in order. Hints are optional and only shown when asked for. */
export const HINT_COSTS = [500, 1000, 1500]

/** Total cost of taking the first `hints` hints. */
export function hintPenalty(hints: number): number {
  return HINT_COSTS.slice(0, Math.max(0, Math.min(hints, HINT_COSTS.length))).reduce((sum, cost) => sum + cost, 0)
}

export function songPoints(seconds: number, wrongGuesses: number, hints = 0): number {
  return Math.max(0, clipWorth(seconds) - wrongGuesses * WRONG_GUESS_PENALTY - hintPenalty(hints))
}

export function formatSeconds(seconds: number): string {
  return seconds < 10 ? `${Number(seconds.toFixed(1))}s` : `${Math.round(seconds)}s`
}

export const formatPoints = (points: number) => points.toLocaleString('en-US')
