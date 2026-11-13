import { useState } from 'react'
import type { Song } from './data/songs'
import { dayNumber, localDateKey } from './lib/daily'
import { buildRun, dailyRun, filterSongs, type RunOptions } from './lib/run'
import { loadDaily, loadOptions, loadStats, recordRun, saveDaily, saveOptions, type RunRecord, type SongResult } from './lib/storage'
import { Home } from './components/Home'
import { Round } from './components/Round'
import { Summary } from './components/Summary'

type Screen =
  | { kind: 'home' }
  | { kind: 'run'; songs: Song[]; results: SongResult[]; daily: string | null }
  | { kind: 'summary'; run: RunRecord; daily: string | null }

export default function App() {
  const [options, setOptions] = useState<RunOptions>(loadOptions)
  const [screen, setScreen] = useState<Screen>({ kind: 'home' })
  const [stats, setStats] = useState(loadStats)
  const today = localDateKey()

  function changeOptions(next: RunOptions) {
    setOptions(next)
    saveOptions(next)
  }

  function startRun() {
    const songs = buildRun(filterSongs(options))
    if (songs.length) setScreen({ kind: 'run', songs, results: [], daily: null })
  }

  function startDaily() {
    const finished = loadDaily(today)
    if (finished) setScreen({ kind: 'summary', run: finished, daily: today })
    else setScreen({ kind: 'run', songs: dailyRun(today), results: [], daily: today })
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
    window.scrollTo({ top: 0 })
  }

  const goHome = () => setScreen({ kind: 'home' })

  return (
    <div className="page">
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label="Praise Play home">
          <span className="brand-mark" aria-hidden="true">♪</span> praise play
        </button>
      </header>

      {screen.kind === 'home' && (
        <Home options={options} onOptions={changeOptions} onStart={startRun} onDaily={startDaily} daily={loadDaily(today)} dayNumber={dayNumber(today)} stats={stats} />
      )}

      {screen.kind === 'run' && (
        <Round
          key={`${screen.results.length}:${screen.songs[screen.results.length].id}`}
          song={screen.songs[screen.results.length]}
          nextSong={screen.songs[screen.results.length + 1]}
          index={screen.results.length}
          total={screen.songs.length}
          runScore={screen.results.reduce((sum, r) => sum + r.points, 0)}
          onNext={next}
          onQuit={goHome}
        />
      )}

      {screen.kind === 'summary' && (
        <Summary run={screen.run} daily={screen.daily ? dayNumber(screen.daily) : null} onAgain={startRun} onHome={goHome} />
      )}

      <footer>Made for music that lifts the spirit <span>✦</span> Song previews courtesy of Apple Music</footer>
    </div>
  )
}
