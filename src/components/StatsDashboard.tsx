import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { excludeThisDevice } from '../lib/analytics'
import { localDateKey } from '../lib/daily'
import { christmasPreviewOn, inChristmasSeason, seasonYear, setChristmasPreview } from '../lib/seasonal'
import { saveSetting } from '../lib/storage'
import { loadThemeId, saveThemeId } from '../lib/theme'
import { ChristmasLights } from './ChristmasLights'

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
  const [popup, setPopup] = useState<null | 'loading' | 'unlocked' | 'hidden'>(null)

  /** Secret code "Christmas": turns Christmas mode on (or off) on this device, any time of year. */
  function toggleXmas() {
    const on = !xmas
    setChristmasPreview(on)
    setXmas(on)
    if (!on) { setPopup('hidden'); return }
    setPopup('loading')
    window.setTimeout(() => setPopup('unlocked'), 1400)
  }

  const load = useCallback(async (passphrase: string, count: number) => {
    setLoading(true); setError(null)
    try {
      const response = await fetch(`/api/stats?days=${count}&today=${localDateKey()}`, { headers: { 'x-stats-key': passphrase } })
      if (response.status === 401) { setError('That code doesn’t open anything.'); setKey(''); try { localStorage.removeItem(KEY) } catch { /* ignore */ } return }
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
        <h2>The Vault</h2>
        <p className="muted">Enter a code.</p>
        <form className="stats-login" onSubmit={(e) => {
          e.preventDefault()
          if (input.trim().toLowerCase() === 'christmas') { toggleXmas(); setInput(''); return }
          if (input.trim()) load(input.trim(), range)
        }}>
          <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Code" autoFocus autoComplete="current-password" />
          <button className="primary" disabled={loading}>{loading ? 'Checking…' : 'Enter'}</button>
        </form>
        {error && <p className="stats-error">{error}</p>}
        {popup && <XmasPopup state={popup} onClose={() => setPopup(null)} />}
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
          <h2>The Vault</h2>
        </div>
        <button className="text-button" onClick={() => { setKey(''); setDays(null); try { localStorage.removeItem(KEY) } catch { /* ignore */ } }}>Lock</button>
      </div>
      <button className={`stats-xmas${xmas ? ' on' : ''}`} onClick={toggleXmas}>🎄 Christmas mode on this device: <b>{xmas ? 'unlocked' : 'off'}</b></button>
      {popup && <XmasPopup state={popup} onClose={() => setPopup(null)} />}
      <h3 className="vault-section">Play stats</h3>
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

/** Popups go on top of the whole page (the stats card is animated, which would trap them inside it). */
const OnTop = ({ children }: { children: ReactNode }) => createPortal(children, document.body)

function XmasPopup(props: { state: 'loading' | 'unlocked' | 'hidden'; onClose: () => void }) {
  return <OnTop><XmasPopupInner {...props} /></OnTop>
}

function XmasPopupInner({ state, onClose }: { state: 'loading' | 'unlocked' | 'hidden'; onClose: () => void }) {
  function play() {
    // Home with Christmas switched on: Christmas songs, the Christmas theme, lights and snow.
    saveSetting('christmasMode', { season: seasonYear(), on: true })
    const theme = loadThemeId()
    if (theme !== 'christmas') { saveSetting('themeBeforeChristmas', theme); saveThemeId('christmas') }
    location.href = '/'
  }
  if (state === 'loading') {
    return (
      <div className="overlay xmas-pop-overlay">
        <div className="xmas-pop loading" role="status"><span className="xmas-gift">🎁</span><p>Unwrapping…</p></div>
      </div>
    )
  }
  if (state === 'hidden') {
    return (
      <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="xmas-pop" role="dialog" aria-modal="true">
          <h2>Christmas mode hidden</h2>
          <p className="muted">{inChristmasSeason() ? 'It’s Christmas season, so it stays on for everyone anyway.' : 'It’s hidden on this device again until December 1st. Type Christmas to bring it back.'}</p>
          <button className="primary wide" onClick={onClose}>OK</button>
        </div>
      </div>
    )
  }
  return (
    <>
    <div className="overlay xmas-pop-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="xmas-pop unlocked" role="dialog" aria-modal="true" aria-labelledby="xmas-pop-title">
        <div className="xmas-tree" aria-hidden="true">🎄</div>
        <p className="eyebrow">Secret unlocked</p>
        <h2 id="xmas-pop-title">Christmas mode</h2>
        <p>Christmas songs, lights and snow on this device, any time of year. Host a friends room and everyone who joins gets it too.</p>
        <button className="primary big wide shine" onClick={play} autoFocus>🎄 Play Christmas mode</button>
        <button className="text-button" onClick={onClose}>Not now</button>
      </div>
    </div>
    <div className="xmas-pop-lights"><ChristmasLights /></div>
    </>
  )
}
