/**
 * Global leaderboard for solo 5-song runs.
 *
 *   GET  /api/leaderboard          → { today: Entry[], allTime: Entry[], day }
 *   POST /api/leaderboard {name, results} → { entry, rank: { today, allTime }, today, allTime }
 *
 * Scores live in Netlify Blobs (built into every Netlify site, nothing to set up).
 * The server recomputes each score from the per-song details with the same
 * formula as the game, so a hand-edited total is ignored.
 */
import { getStore } from '@netlify/blobs'
import { RUN_LENGTH, songPoints } from '../../src/lib/scoring'

type Entry = { id: string; name: string; score: number; named: number; at: string }
type Board = { entries: Entry[] }
type SongIn = { outcome?: string; seconds?: number; wrong?: number; hints?: number }

const KEEP = 100
const SHOW = 50
const NAME_MAX = 16
// Keep it friendly: a short list of words that can't appear in names.
const BLOCKED = /(fuck|shit|bitch|cunt|dick|cock|pussy|nigg|fag|slut|whore|rape|nazi|hitler|porn|sex)/i

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

const today = () => new Date().toISOString().slice(0, 10)

function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.normalize('NFKC').replace(/[^\p{L}\p{N} ._'!-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
  if (name.length < 2 || BLOCKED.test(name.replace(/[^a-z]/gi, ''))) return null
  return name
}

function scoreRun(results: unknown): { score: number; named: number } | null {
  if (!Array.isArray(results) || results.length !== RUN_LENGTH) return null
  let score = 0
  let named = 0
  for (const song of results as SongIn[]) {
    if (song.outcome !== 'named') continue
    const seconds = Number(song.seconds)
    const wrong = Number(song.wrong ?? 0)
    const hints = Number(song.hints ?? 0)
    if (!(seconds >= 0.1 && seconds <= 30) || !(wrong >= 0 && wrong < 100) || !(hints >= 0 && hints <= 3)) return null
    score += songPoints(seconds, Math.floor(wrong), Math.floor(hints))
    named += 1
  }
  return { score, named }
}

const rankIn = (entries: Entry[], id: string) => {
  const index = entries.findIndex((e) => e.id === id)
  return index < 0 ? null : index + 1
}

async function addTo(key: string, entry: Entry): Promise<Entry[]> {
  const store = getStore({ name: 'leaderboard', consistency: 'strong' })
  // Optimistic concurrency: retry if another score landed between our read and write.
  for (let attempt = 0; attempt < 15; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 60 * attempt))
    const current = await store.getWithMetadata(key, { type: 'json' })
    const board: Board = (current?.data as Board | undefined) ?? { entries: [] }
    const entries = [...board.entries, entry].sort((a, b) => b.score - a.score || a.at.localeCompare(b.at)).slice(0, KEEP)
    const options = current ? { onlyIfMatch: current.etag } : { onlyIfNew: true }
    const result = await store.setJSON(key, { entries }, options as never)
    if (!result || (result as { modified?: boolean }).modified !== false) return entries
  }
  throw new Error('Leaderboard is busy, try again')
}

async function read(key: string): Promise<Entry[]> {
  const store = getStore({ name: 'leaderboard', consistency: 'strong' })
  const board = (await store.get(key, { type: 'json' })) as Board | null
  return board?.entries ?? []
}

export default async (request: Request) => {
  const day = today()
  try {
    if (request.method === 'GET') {
      const [todays, allTime] = await Promise.all([read(`day-${day}`), read('all-time')])
      return json({ day, today: todays.slice(0, SHOW), allTime: allTime.slice(0, SHOW) })
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    // Health check: exercises the same save path on a private key that no board shows.
    if (new URL(request.url).searchParams.get('check') === '1') {
      const probe: Entry = { id: crypto.randomUUID(), name: 'healthcheck', score: 1, named: 0, at: new Date().toISOString() }
      const entries = await addTo('healthcheck', probe)
      return json({ ok: entries.some((e) => e.id === probe.id) })
    }

    const body = (await request.json().catch(() => null)) as { name?: unknown; results?: unknown } | null
    const name = cleanName(body?.name)
    if (!name) return json({ error: 'Pick a name between 2 and 16 characters.' }, 400)
    const run = scoreRun(body?.results)
    if (!run) return json({ error: 'That run could not be checked.' }, 400)
    if (run.score <= 0) return json({ error: 'Name at least one song to get on the board.' }, 400)

    const entry: Entry = { id: crypto.randomUUID(), name, score: run.score, named: run.named, at: new Date().toISOString() }
    const [todays, allTime] = await Promise.all([addTo(`day-${day}`, entry), addTo('all-time', entry)])
    return json({ entry, day, rank: { today: rankIn(todays, entry.id), allTime: rankIn(allTime, entry.id) }, today: todays.slice(0, SHOW), allTime: allTime.slice(0, SHOW) })
  } catch (error) {
    return json({ error: (error as Error).message || 'Leaderboard unavailable' }, 500)
  }
}

export const config = { path: '/api/leaderboard' }
