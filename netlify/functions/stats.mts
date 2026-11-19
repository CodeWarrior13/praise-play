/**
 * GET /api/stats?days=30 with header x-stats-key: <passphrase>
 * → the daily play summaries for the owner's dashboard (/stats).
 */
import { getStore } from '@netlify/blobs'
import { STATS_KEY_HASH, emptyDay, type Day } from '../lib/stats'

async function sha256(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function allowed(key: string) {
  if (!key) return false
  const own = process.env.STATS_KEY
  return own ? key === own : (await sha256(key)) === STATS_KEY_HASH
}

export default async (request: Request) => {
  if (!(await allowed(request.headers.get('x-stats-key') ?? ''))) {
    await new Promise((resolve) => setTimeout(resolve, 600)) // slow down guessing
    return Response.json({ error: 'Wrong passphrase' }, { status: 401 })
  }
  const url = new URL(request.url)
  const count = Math.max(1, Math.min(90, Number(url.searchParams.get('days')) || 30))
  const end = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('today') ?? '') ? new Date(`${url.searchParams.get('today')}T12:00:00Z`) : new Date()
  const dates = Array.from({ length: count }, (_, i) => new Date(end.getTime() - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10))
  const store = getStore({ name: 'stats', consistency: 'strong' })
  const days = await Promise.all(dates.map(async (date) => ({ date, ...(((await store.get(`day-${date}`, { type: 'json' })) as Day | null) ?? emptyDay()) })))
  return Response.json({ days }, { headers: { 'cache-control': 'no-store' } })
}

export const config = { path: '/api/stats' }
