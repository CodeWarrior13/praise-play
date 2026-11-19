import type { Song } from './catalog'

export type Difficulty = 'mixed' | 'easy' | 'medium' | 'hard' | 'extreme' | 'impossible'

/**
 * Which slice of the pool (ranked best-known first) each difficulty draws from.
 * Shared by solo runs, Endless and multiplayer rooms.
 */
export const DIFFICULTIES: { id: Difficulty; label: string; hint: string; range: [number, number] }[] = [
  { id: 'mixed', label: 'Mixed', hint: 'Starts with hits, ends with deep cuts', range: [0, 1] },
  { id: 'easy', label: 'Easy', hint: 'The biggest hits only', range: [0, 0.06] },
  { id: 'medium', label: 'Medium', hint: 'Songs most fans know', range: [0.06, 0.18] },
  { id: 'hard', label: 'Hard', hint: 'Well-known, but not the top hits', range: [0.18, 0.38] },
  { id: 'extreme', label: 'Extreme', hint: 'Album tracks and B-sides', range: [0.38, 0.68] },
  { id: 'impossible', label: 'Impossible', hint: 'The deepest cuts in the catalog', range: [0.68, 1] },
]

export function poolForDifficulty(pool: Song[], difficulty: Difficulty): Song[] {
  const [from, to] = DIFFICULTIES.find((d) => d.id === difficulty)?.range ?? [0, 1]
  if (from === 0 && to === 1) return pool
  const ranked = [...pool].sort((a, b) => b.popularity - a.popularity || a.trackId - b.trackId)
  const slice = ranked.slice(Math.floor(from * ranked.length), Math.ceil(to * ranked.length))
  return slice.length >= 10 ? slice : ranked
}

export const difficultyLabel = (id: Difficulty) => DIFFICULTIES.find((d) => d.id === id)?.label ?? 'Mixed'
