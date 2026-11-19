/**
 * Anonymous play stats for the owner's dashboard (/stats).
 *
 *   POST /api/visit {type: 'start' | 'beat' | 'game', seconds?, mode?, firstToday?, returning?}
 *
 * Location is the rough country/city Netlify works out from the connection;
 * no IP address, name or device ID is stored. Everything is added into one
 * small summary per day in Netlify Blobs.
 */
import { getStore } from '@netlify/blobs'
import { emptyDay, type Day } from '../lib/stats'

type Context = { geo?: { city?: string; country?: { code?: string; name?: string }; subdivision?: { code?: string; name?: string } } }

const MODES = new Set(['run', 'endless', 'daily', 'multi', 'christmas'])

async function update(key: string, change: (day: Day) => void) {
  const store = getStore({ name: 'stats', consistency: 'strong' })
  for (let attempt = 0; attempt < 12; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 60 * attempt))
    const current = await store.getWithMetadata(key, { type: 'json' })
    const day = (current?.data as Day | undefined) ?? emptyDay()
    change(day)
    const result = await store.setJSON(key, day, (current ? { onlyIfMatch: current.etag } : { onlyIfNew: true }) as never)
    if (!result || (result as { modified?: boolean }).modified !== false) return
  }
}

export default async (request: Request, context: Context) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 })
  const body = (await request.json().catch(() => null)) as { type?: string; seconds?: number; mode?: string; firstToday?: boolean; returning?: boolean; day?: string } | null
  if (!body || !['start', 'beat', 'game'].includes(String(body.type))) return new Response(null, { status: 400 })

  const geo = context.geo ?? {}
  const code = geo.country?.code ?? '??'
  const country = geo.country?.name ?? 'Unknown'
  const city = geo.city ? `${geo.city}|${geo.subdivision?.name ?? geo.subdivision?.code ?? ''}|${code}` : `Unknown|${country}|${code}`
  // The player's own date, so "today" means their today (falls back to UTC).
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.day)) ? String(body.day) : new Date().toISOString().slice(0, 10)
  const seconds = Math.max(0, Math.min(120, Math.round(Number(body.seconds) || 0)))

  try {
    await update(`day-${date}`, (day) => {
      const c = (day.countries[code] ??= { name: country, visits: 0, players: 0, seconds: 0, games: 0 })
      const t = (day.cities[city] ??= { visits: 0, players: 0, seconds: 0, games: 0 })
      if (body.type === 'start') {
        day.visits += 1; c.visits += 1; t.visits += 1
        if (body.firstToday) { day.players += 1; c.players += 1; t.players += 1; if (body.returning) day.returning += 1 }
      } else if (body.type === 'beat') {
        day.seconds += seconds; c.seconds += seconds; t.seconds += seconds
      } else {
        const mode = MODES.has(String(body.mode)) ? String(body.mode) : 'run'
        day.games[mode] = (day.games[mode] ?? 0) + 1; c.games += 1; t.games += 1
      }
    })
  } catch {
    // Stats are best effort; never bother the player about them.
  }
  return new Response(null, { status: 204 })
}

export const config = { path: '/api/visit' }
