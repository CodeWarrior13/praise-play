import { defaultOptions, type RunOptions } from './run'

export type SongResult = {
  songId: string
  title: string
  artist: string
  /** Clip length unlocked when the song was named (or skipped). */
  seconds: number
  wrongGuesses: number
  points: number
  outcome: 'named' | 'skipped'
}

export type RunRecord = { total: number; results: SongResult[] }

export type Stats = { runs: number; totalPoints: number; best: number; songsNamed: number; fastest?: number }

const PREFIX = 'praise-play:v4'

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
    // Storage may be unavailable (private browsing); the game still works for this visit.
  }
}

export const loadOptions = (): RunOptions => ({ ...defaultOptions, ...read<Partial<RunOptions>>('options') })
export const saveOptions = (options: RunOptions) => write('options', options)

export const loadStats = (): Stats => read<Stats>('stats') ?? { runs: 0, totalPoints: 0, best: 0, songsNamed: 0 }

export function recordRun(run: RunRecord): Stats {
  const stats = loadStats()
  stats.runs += 1
  stats.totalPoints += run.total
  stats.best = Math.max(stats.best, run.total)
  for (const result of run.results) {
    if (result.outcome !== 'named') continue
    stats.songsNamed += 1
    stats.fastest = Math.min(stats.fastest ?? Infinity, result.seconds)
  }
  write('stats', stats)
  return stats
}

export const loadDaily = (dateKey: string) => read<RunRecord>(`daily:${dateKey}`)
export const saveDaily = (dateKey: string, run: RunRecord) => write(`daily:${dateKey}`, run)

export const loadSetting = <T,>(key: string, fallback: T): T => read<T>(`setting:${key}`) ?? fallback
export const saveSetting = (key: string, value: unknown) => write(`setting:${key}`, value)
