import type { Song } from '../data/songs'

/** Clip lengths in seconds for each attempt. The last entry is the longest clip. */
export const CLIP_STAGES = [0.5, 1, 2, 4, 8, 16]
export const MAX_ATTEMPTS = CLIP_STAGES.length

/** Day #1 of Praise Play. Puzzle numbers count up from here. */
const LAUNCH = Date.UTC(2026, 10, 13)
const DAY_MS = 86_400_000

/** Local calendar date as YYYY-MM-DD, so the song changes at the player's midnight. */
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  return Math.floor((Date.UTC(y, m - 1, d) - LAUNCH) / DAY_MS)
}

export function puzzleNumber(dateKey: string): number {
  return dayNumber(dateKey) + 1
}

function hashString(text: string): number {
  let hash = 2166136261
  for (const ch of text) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0
  return hash
}

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const random = mulberry32(seed)
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Walk through a shuffled copy of the pool one song per day, so no song repeats
 * until every song in the mode has been used. Sorting by ID first means the
 * order of songs.ts does not matter.
 */
export function dailySong(pool: Song[], modeId: string, dateKey: string): Song | undefined {
  if (!pool.length) return undefined
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id))
  const day = Math.max(0, dayNumber(dateKey))
  const cycle = Math.floor(day / sorted.length)
  const order = seededShuffle(sorted, hashString(`${modeId}:${cycle}`))
  return order[day % sorted.length]
}

export function randomSong(pool: Song[], excludeId?: string): Song | undefined {
  const options = pool.length > 1 ? pool.filter((song) => song.id !== excludeId) : pool
  return options[Math.floor(Math.random() * options.length)]
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\b(feat|ft|featuring)\b.*$/, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Covers with the same title count as correct. */
export function isCorrectGuess(guess: Song, answer: Song): boolean {
  return guess.id === answer.id || normalize(guess.title) === normalize(answer.title)
}

export function msUntilTomorrow(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime()
}
