import { MAX_ATTEMPTS } from './daily'

export type Attempt = { kind: 'skip' } | { kind: 'guess'; songId: string; correct: boolean }

export type Round = {
  songId: string
  attempts: Attempt[]
  status: 'playing' | 'won' | 'lost'
}

export type Stats = {
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  /** Index 0–5: solved on that attempt. Index 6: not solved. */
  distribution: number[]
  lastPlayed?: string
  lastWon?: string
}

const PREFIX = 'praise-play:v2'

function read<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(`${PREFIX}:${key}`)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode); the game still works for this visit.
  }
}

export const loadRound = (modeId: string, dateKey: string) => read<Round>(`round:${modeId}:${dateKey}`)
export const saveRound = (modeId: string, dateKey: string, round: Round) => write(`round:${modeId}:${dateKey}`, round)

export function emptyStats(): Stats {
  return { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: Array(MAX_ATTEMPTS + 1).fill(0) }
}

export const loadStats = (modeId: string) => read<Stats>(`stats:${modeId}`) ?? emptyStats()

function previousDay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Records a finished daily round once. */
export function recordResult(modeId: string, dateKey: string, round: Round): Stats {
  const stats = loadStats(modeId)
  if (stats.lastPlayed === dateKey) return stats
  stats.played += 1
  stats.lastPlayed = dateKey
  if (round.status === 'won') {
    stats.wins += 1
    stats.currentStreak = stats.lastWon === previousDay(dateKey) ? stats.currentStreak + 1 : 1
    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak)
    stats.lastWon = dateKey
    stats.distribution[round.attempts.length - 1] += 1
  } else {
    stats.currentStreak = 0
    stats.distribution[MAX_ATTEMPTS] += 1
  }
  write(`stats:${modeId}`, stats)
  return stats
}

export const loadSetting = <T,>(key: string, fallback: T): T => read<T>(`setting:${key}`) ?? fallback
export const saveSetting = (key: string, value: unknown) => write(`setting:${key}`, value)
