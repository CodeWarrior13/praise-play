import type { SongResult } from './storage'
import { loadSetting, saveSetting } from './storage'

export type Entry = { id: string; name: string; score: number; named: number; at: string }
export type Boards = { day: string; today: Entry[]; allTime: Entry[] }
export type Submitted = Boards & { entry: Entry; rank: { today: number | null; allTime: number | null } }

const API = '/api/leaderboard'
/** Boards show the top 50. */
export const BOARD_SIZE = 50

export async function fetchBoards(): Promise<Boards> {
  const response = await fetch(API, { cache: 'no-store' })
  if (!response.ok) throw new Error('Leaderboard unavailable')
  return response.json()
}

export async function submitRun(name: string, results: SongResult[]): Promise<Submitted> {
  const response = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, results: results.map(({ outcome, seconds, wrongGuesses, hints }) => ({ outcome, seconds, wrong: wrongGuesses, hints: hints ?? 0 })) }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error ?? 'Could not save your score')
  rememberEntry(body.entry.id)
  return body
}

/** Where a score would land on a board (1-based), or null if it wouldn't make the top 50. */
export function wouldRank(entries: Entry[], score: number): number | null {
  if (score <= 0) return null
  const rank = entries.filter((e) => e.score >= score).length + 1
  return rank <= BOARD_SIZE ? rank : null
}

export const myEntries = (): string[] => loadSetting<string[]>('myEntries', [])
function rememberEntry(id: string) {
  saveSetting('myEntries', [...myEntries(), id].slice(-50))
}
