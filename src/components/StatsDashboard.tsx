import { useCallback, useEffect, useMemo, useState } from 'react'
import { excludeThisDevice } from '../lib/analytics'
import { localDateKey } from '../lib/daily'
import { christmasPreviewOn, inChristmasSeason, setChristmasPreview } from '../lib/seasonal'

type Place = { visits: number; players: number; seconds: number; games: number }
type Day = {
  date: string
  visits: number
  players: number
  returning: number
  seconds: number
  games: Record<string, number>
  countries: Record<string, Place & { name: string }>
  cities: Record<string, Place>
}

const KEY = 'praise-play:stats-key'
const RANGES = [{ days: 1, label: 'Today' }, { days: 7, label: '7 days' }, { days: 30, label: '30 days' }, { days: 90, label: '90 days' }]
const MODE_LABELS: Record<string, string> = { run: 'Solo', endless: 'Endless', daily: 'Daily', multi: 'Friends', christmas: 'Christmas' }

const flag = (code: string) => (/^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌐')
function duration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
const fmt = (n: number) => n.toLocaleString('en-US')

function addPlace(into: Record<string, Place & { name?: string }>, key: string, place: Place & { name?: string }) {
  const p = (into[key] ??= { name: place.name, visits: 0, players: 0, seconds: 0, games: 0 })
  p.visits += place.visits; p.players += place.players; p.seconds += place.seconds; p.games += place.games
}

/** The owner's private stats page: where people play from and for how long. Open /stats. */
export function StatsDashboard() {
  const [key, setKey] = useState(() => { try { return localStorage.getItem(KEY) ?? '' } catch { return '' } })
  const [input, setInput] = useState('')
  const [range, setRange] = useState(7)
  const [days, setDays] = useState<Day[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [xmas, setXmas] = useState(christmasPreviewOn)
  const [xmasNote, setXmasNote] = useState<string | null>(null)

  /** The secret word: "Christmas" turns Christmas mode on (or off) on this device, any time of year. */
  function toggleXmas() {
    const on = !xmas
    setChristmasPreview(on)
    setXmas(on)
    setXmasNote(on
      ? '🎄 Christmas mode unlocked on this device. Go home to play, or host a friends room for Christmas songs.'
      : inChristmasSeason() ? 'Preview off. (It’s Christmas season, so Christmas mode stays on for everyone.)' : 'Christmas mode hidden again on this device.')
  }

  const load = useCallback(async (passphrase: string, count: number) => {
    setLoading(true); setError(null)
    try {
      const response = await fetch(`/api/stats?days=${count}&today=${localDateKey()}`, { headers: { 'x-stats-key': passphrase } })
      if (response.status === 401) { setError('That passphrase isn’t right.'); setKey(''); try { localStorage.removeItem(KEY) } catch { /* ignore */ } return }
      if (!response.ok) throw new Error(String(response.status))
      setDays(((await response.json()) as { days: Day[] }).days)
      setKey(passphrase)
      try { localStorage.setItem(KEY, passphrase) } catch { /* ignore */ }
      excludeThisDevice() // your own playing won't count from this device
    } catch {
      setError('Couldn’t load the stats. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (key) load(key, range) }, [key, range, load])

  const total = useMemo(() => {
    if (!days) return null
    const countries: Record<string, Place & { name?: string }> = {}
    const cities: Record<string, Place> = {}
    const games: Record<string, number> = {}
    let visits = 0, players = 0, returning = 0, seconds = 0
    for (const day of days) {
      visits += day.visits; players += day.players; returning += day.returning; seconds += day.seconds
      for (const [mode, n] of Object.entries(day.games)) games[mode] = (games[mode] ?? 0) + n
      for (const [code, place] of Object.entries(day.countries)) addPlace(countries, code, place)
      for (const [city, place] of Object.entries(day.cities)) addPlace(cities, city, place)
    }
    const byPlayers = (a: [string, Place], b: [string, Place]) => b[1].players - a[1].players || b[1].seconds - a[1].seconds
    return {
      visits, players, returning, seconds,
      games, gameCount: Object.values(games).reduce((s, n) => s + n, 0),
      countries: Object.entries(countries).sort(byPlayers) as [string, Place & { name: string }][],
      cities: Object.entries(cities).sort(byPlayers),
    }
  }, [days])

  if (!key) {
    return (
      <section className="card stats-page enter">
        <p className="eyebrow">Owner only</p>
        <h2>Play stats</h2>
        <p className="muted">Enter your stats passphrase.</p>
        <form className="stats-login" onSubmit={(e) => {
          e.preventDefault()
          if (input.trim().toLowerCase() === 'christmas') { toggleXmas(); setInput(''); return }
          if (input.trim()) load(input.trim(), range)
        }}>
          <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Passphrase" autoFocus autoComplete="current-password" />
          <button className="primary" disabled={loading}>{loading ? 'Checking…' : 'Open'}</button>
        </form>
        {error && <p className="stats-error">{error}</p>}
        {xmasNote && <XmasNote text={xmasNote} />}
      </section>
    )
  }

  const peak = Math.max(1, ...(days ?? []).map((d) => d.players))
  const topCountry = total?.countries[0]?.[1].players || 1
  return (
    <section className="card stats-page enter">
      <div className="stats-head">
        <div>
          <p className="eyebrow">Owner only</p>
          <h2>Play stats</h2>
        </div>
        <button className="text-button" onClick={() => { setKey(''); setDays(null); try { localStorage.removeItem(KEY) } catch { /* ignore */ } }}>Lock</button>
      </div>
      <button className={`stats-xmas${xmas ? ' on' : ''}`} onClick={toggleXmas}>🎄 Christmas mode on this device: <b>{xmas ? 'unlocked' : 'off'}</b></button>
      {xmasNote && <XmasNote text={xmasNote} />}
      <div className="segmented four stats-range">
        {RANGES.map((r) => <button key={r.days} className={range === r.days ? 'active' : ''} onClick={() => setRange(r.days)}>{r.label}</button>)}
      </div>
      {error && <p className="stats-error">{error}</p>}
      {!total ? <p className="muted">Loading…</p> : (
        <>
          <div className="stats-kpis">
            <div><strong>{fmt(total.players)}</strong><span>players</span></div>
            <div><strong>{duration(total.seconds)}</strong><span>time played</span></div>
            <div><strong>{total.players ? duration(total.seconds / total.players) : '—'}</strong><span>per player</span></div>
            <div><strong>{fmt(total.gameCount)}</strong><span>games</span></div>
            <div><strong>{fmt(total.visits)}</strong><span>visits</span></div>
            <div><strong>{total.players ? `${Math.round((total.returning / total.players) * 100)}%` : '—'}</strong><span>came back</span></div>
          </div>
          {total.gameCount > 0 && (
            <p className="stats-modes">{Object.entries(total.games).sort((a, b) => b[1] - a[1]).map(([mode, n]) => `${MODE_LABELS[mode] ?? mode} ${fmt(n)}`).join(' · ')}</p>
          )}
          {days && days.length > 1 && (
            <div className="stats-chart" aria-label="Players per day">
              {days.map((d) => (
                <div key={d.date} title={`${d.date}: ${d.players} players, ${duration(d.seconds)}`}>
                  <span style={{ height: `${(d.players / peak) * 100}%` }} />
                  {days.length <= 14 && <small>{d.date.slice(8)}</small>}
                </div>
              ))}
            </div>
          )}
          <h3>Countries</h3>
          {total.countries.length === 0 ? <p className="muted small">No players yet in this range.</p> : (
            <ol className="stats-table">
              {total.countries.slice(0, 25).map(([code, c]) => (
                <li key={code}>
                  <span className="stats-place">{flag(code)} {c.name}</span>
                  <span className="stats-bar"><i style={{ width: `${(c.players / topCountry) * 100}%` }} /></span>
                  <span className="stats-num">{fmt(c.players)} <small>players</small></span>
                  <span className="stats-num">{duration(c.seconds)}</span>
                </li>
              ))}
            </ol>
          )}
          <h3>Cities</h3>
          {total.cities.length === 0 ? <p className="muted small">No players yet in this range.</p> : (
            <ol className="stats-table">
              {total.cities.slice(0, 40).map(([id, c]) => {
                const [city, region, code] = id.split('|')
                return (
                  <li key={id}>
                    <span className="stats-place">{flag(code)} {city}{region ? <small>, {region}</small> : null}</span>
                    <span className="stats-num">{fmt(c.players)} <small>players</small></span>
                    <span className="stats-num">{fmt(c.games)} <small>games</small></span>
                    <span className="stats-num">{duration(c.seconds)}</span>
                  </li>
                )
              })}
            </ol>
          )}
          <p className="muted small stats-foot">Locations are approximate (from each player’s internet connection). Your own plays on this device aren’t counted.</p>
        </>
      )}
    </section>
  )
}

function XmasNote({ text }: { text: string }) {
  return (
    <p className="stats-xmas-note">
      {text} <a href="/" onClick={(e) => { e.preventDefault(); location.href = '/' }}>Go home →</a>
    </p>
  )
}
