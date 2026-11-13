import { useEffect, useState } from 'react'
import { loadCatalog, type Catalog, type Song } from './lib/catalog'
import { dayNumber, localDateKey } from './lib/daily'
import { prefetchPreviews } from './lib/preview'
import { buildRun, dailyRun, filterSongs, type RunOptions } from './lib/run'
import { loadDaily, loadOptions, loadStats, recordRun, saveDaily, saveOptions, type RunRecord, type SongResult } from './lib/storage'
import { applyTheme, findTheme, loadThemeId, saveThemeId } from './lib/theme'
import { Home } from './components/Home'
import { Round } from './components/Round'
import { Summary } from './components/Summary'
import { ThemePicker } from './components/ThemePicker'
import { Backdrop } from './components/Fx'

type Screen =
  | { kind: 'home' }
  | { kind: 'run'; songs: Song[]; results: SongResult[]; daily: string | null }
  | { kind: 'summary'; run: RunRecord; daily: string | null }

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<RunOptions>(loadOptions)
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [stats, setStats] = useState(loadStats)
  const [themeId, setThemeId] = useState(loadThemeId)
  const today = localDateKey()

  useEffect(() => { applyTheme(findTheme(themeId)) }, [themeId])

  useEffect(() => {
    loadCatalog().then(setCatalog, (e: Error) => setError(e.message))
  }, [])

  function changeTheme(id: string) {
    setThemeId(id)
    saveThemeId(id)
  }

  function changeOptions(next: RunOptions) {
    setOptions(next)
    saveOptions(next)
  }

  function begin(songs: Song[], daily: string | null) {
    prefetchPreviews(songs)
    setScreen({ kind: 'run', songs, results: [], daily })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startRun() {
    if (!catalog) return
    const songs = buildRun(filterSongs(catalog, options))
    if (songs.length) begin(songs, null)
  }

  function startDaily() {
    if (!catalog) return
    const finished = loadDaily(today)
    if (finished) setScreen({ kind: 'summary', run: finished, daily: today })
    else begin(dailyRun(catalog, today), today)
  }

  function next(result: SongResult) {
    if (screen.kind !== 'run') return
    const results = [...screen.results, result]
    if (results.length < screen.songs.length) {
      setScreen({ ...screen, results })
      return
    }
    const run: RunRecord = { total: results.reduce((sum, r) => sum + r.points, 0), results }
    setStats(recordRun(run))
    if (screen.daily) saveDaily(screen.daily, run)
    setScreen({ kind: 'summary', run, daily: screen.daily })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goHome = () => setScreen({ kind: 'home' })

  return (
    <>
      <Backdrop />
      <div className="page">
        <header className="topbar">
          <button className="brand" onClick={goHome} aria-label="Praise Play home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 18.5a3 3 0 1 1-2-2.83V5.5l12-2.5v12a3 3 0 1 1-2-2.83V7.6l-8 1.7v9.2Z" /></svg>
            </span>
            <span>praise<b>play</b></span>
          </button>
          <ThemePicker value={themeId} onChange={changeTheme} />
        </header>

        {!catalog ? (
          <div className="loading enter">
            {error ? (
              <>
                <p>Couldn’t load the song catalog.</p>
                <button className="primary" onClick={() => { setError(null); loadCatalog().then(setCatalog, (e: Error) => setError(e.message)) }}>Try again</button>
              </>
            ) : (
              <>
                <span className="loading-orb" />
                <p>Tuning up…</p>
              </>
            )}
          </div>
        ) : screen.kind === 'home' ? (
          <Home catalog={catalog} options={options} onOptions={changeOptions} onStart={startRun} onDaily={startDaily} daily={loadDaily(today)} dayNumber={dayNumber(today)} stats={stats} />
        ) : screen.kind === 'run' ? (
          <Round
            key={`${screen.results.length}:${screen.songs[screen.results.length].id}`}
            catalog={catalog}
            song={screen.songs[screen.results.length]}
            index={screen.results.length}
            total={screen.songs.length}
            runScore={screen.results.reduce((sum, r) => sum + r.points, 0)}
            onNext={next}
            onQuit={goHome}
          />
        ) : (
          <Summary run={screen.run} daily={screen.daily ? dayNumber(screen.daily) : null} onAgain={startRun} onHome={goHome} />
        )}

        <footer>Made for music that lifts the spirit <span>✦</span> Previews & artwork courtesy of Apple Music</footer>
      </div>
    </>
  )
}
