import { useCallback, useEffect, useState } from 'react'
import { loadCatalog, type Catalog, type Song } from './lib/catalog'
import { dayNumber, localDateKey } from './lib/daily'
import { prefetchPreviews } from './lib/preview'
import { buildRun, dailyRun, endlessLevel, endlessSong, filterSongs, type RunOptions } from './lib/run'
import { DIFFICULTY } from './lib/scoring'
import { loadDaily, loadOptions, loadStats, recordEndless, recordRun, saveDaily, saveOptions, type RunRecord, type SongResult } from './lib/storage'
import { applyTheme, findTheme, loadThemeId, saveThemeId } from './lib/theme'
import { Home } from './components/Home'
import { Round } from './components/Round'
import { Summary } from './components/Summary'
import { ThemePicker } from './components/ThemePicker'
import { Backdrop } from './components/Fx'
import { HelpDialog } from './components/HelpDialog'
import { Multiplayer } from './components/Multiplayer'
import { LeaderboardDialog } from './components/Leaderboard'
import { Splash } from './components/Splash'
import { InstallPrompt } from './components/InstallPrompt'
import { onShortcut, typingInField } from './lib/keys'
import { saveSetting } from './lib/storage'

export type Mode = 'run' | 'daily' | 'endless'
export const ENDLESS_LIVES = 3

type Game = {
  mode: Mode
  songs: Song[]
  results: SongResult[]
  /** The filtered pool, kept for swapping songs and endless mode. */
  pool: Song[]
  daily: string | null
  lives: number
}

type Screen = { kind: 'home' } | { kind: 'multi'; code: string } | { kind: 'play'; game: Game } | { kind: 'summary'; run: RunRecord; mode: Mode; daily: string | null }

const scored = (results: SongResult[]) => results.filter((r) => r.outcome !== 'unavailable')

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<RunOptions>(loadOptions)
  // Invite links look like ?room=ABCDE and open the multiplayer join screen.
  const [screen, setScreen] = useState<Screen>(() => {
    const code = new URLSearchParams(location.search).get('room')
    return code ? { kind: 'multi', code } : { kind: 'home' }
  })
  const [stats, setStats] = useState(loadStats)
  const [themeId, setThemeId] = useState(loadThemeId)
  const [helpOpen, setHelpOpen] = useState(false)
  const [boardOpen, setBoardOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const closeBoard = useCallback(() => setBoardOpen(false), [])
  const today = localDateKey()

  // H opens help. During a round the search box decides whether H was a tap or the
  // start of a word ("Hillsong") and sends a shortcut; elsewhere it opens right away.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.key.toLowerCase() !== 'h' || typingInField(event.target)) return
      if (document.querySelector('[data-guess-input]')) return
      event.preventDefault()
      setHelpOpen(true)
    }
    const offShortcut = onShortcut((key) => { if (key === 'h') setHelpOpen(true) })
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); offShortcut() }
  }, [])

  const closeHelp = useCallback(() => {
    saveSetting('seenHelp', true)
    setHelpOpen(false)
  }, [])

  useEffect(() => { applyTheme(findTheme(themeId)) }, [themeId])

  useEffect(() => {
    loadCatalog().then((loaded) => {
      // Drop saved genre filters that no longer exist (e.g. Latin was removed).
      setOptions((current) => {
        const genres = current.genres.filter((id) => loaded.genres.some((g) => g.id === id))
        return genres.length === current.genres.length ? current : { ...current, genres }
      })
      setCatalog(loaded)
    }, (e: Error) => setError(e.message))
  }, [])

  function changeTheme(id: string) {
    setThemeId(id)
    saveThemeId(id)
  }

  function changeOptions(next: RunOptions) {
    setOptions(next)
    saveOptions(next)
  }

  function begin(game: Game) {
    prefetchPreviews(game.songs.slice(0, 6))
    setScreen({ kind: 'play', game })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startRun() {
    if (!catalog) return
    const pool = filterSongs(catalog, options)
    const songs = buildRun(pool)
    if (songs.length) begin({ mode: 'run', songs, results: [], pool, daily: null, lives: ENDLESS_LIVES })
  }

  function startDaily() {
    if (!catalog) return
    const finished = loadDaily(today)
    if (finished) { setScreen({ kind: 'summary', run: finished, mode: 'daily', daily: today }); return }
    begin({ mode: 'daily', songs: dailyRun(catalog, today), results: [], pool: catalog.songs, daily: today, lives: ENDLESS_LIVES })
  }

  function startEndless() {
    if (!catalog) return
    const pool = filterSongs(catalog, options)
    const first = endlessSong(pool, 0, new Set())
    const second = first && endlessSong(pool, 1, new Set([first.id]))
    if (first) begin({ mode: 'endless', songs: second ? [first, second] : [first], results: [], pool, daily: null, lives: ENDLESS_LIVES })
  }

  function finishGame(game: Game, results: SongResult[]) {
    const counted = scored(results)
    const run: RunRecord = { total: counted.reduce((sum, r) => sum + r.points, 0), results: counted }
    if (game.mode === 'endless') setStats(recordEndless(run.total, counted.filter((r) => r.outcome === 'named').length))
    else setStats(recordRun(run))
    if (game.daily) saveDaily(game.daily, run)
    setScreen({ kind: 'summary', run, mode: game.mode, daily: game.daily })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Swap a song whose audio is unavailable for a similar one, without scoring it. */
  function replacement(game: Game, index: number): Song | undefined {
    const used = new Set(game.songs.map((s) => s.id))
    const target = game.songs[index].popularity
    const options = game.pool.filter((s) => !used.has(s.id) && !s.genres.includes('christmas'))
    options.sort((a, b) => Math.abs(a.popularity - target) - Math.abs(b.popularity - target))
    return options[Math.floor(Math.random() * Math.min(12, options.length))]
  }

  function next(result: SongResult) {
    if (screen.kind !== 'play') return
    const game = screen.game
    const index = game.results.length

    if (result.outcome === 'unavailable') {
      const swap = replacement(game, index)
      if (!swap) { finishGame(game, game.results); return }
      const songs = [...game.songs]
      songs[index] = swap
      prefetchPreviews([swap])
      setScreen({ kind: 'play', game: { ...game, songs } })
      return
    }

    const results = [...game.results, result]
    if (game.mode === 'endless') {
      const lives = result.outcome === 'skipped' ? game.lives - 1 : game.lives
      if (lives <= 0) { finishGame(game, results); return }
      const played = new Set(game.songs.map((s) => s.id))
      const upcoming = endlessSong(game.pool, game.songs.length, played)
      const songs = upcoming ? [...game.songs, upcoming] : game.songs
      if (results.length >= songs.length) { finishGame(game, results); return }
      if (upcoming) prefetchPreviews([upcoming])
      setScreen({ kind: 'play', game: { ...game, results, songs, lives } })
      return
    }

    if (results.length < game.songs.length) setScreen({ kind: 'play', game: { ...game, results } })
    else finishGame(game, results)
  }

  const goHome = () => setScreen({ kind: 'home' })

  function quit() {
    if (screen.kind === 'play' && screen.game.mode === 'endless' && screen.game.results.length) finishGame(screen.game, screen.game.results)
    else goHome()
  }

  let body: React.ReactNode
  if (!catalog) {
    body = (
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
    )
  } else if (screen.kind === 'multi') {
    body = <Multiplayer catalog={catalog} options={options} initialCode={screen.code} onExit={goHome} />
  } else if (screen.kind === 'home') {
    body = <Home catalog={catalog} options={options} onOptions={changeOptions} onStart={startRun} onDaily={startDaily} onEndless={startEndless} onMultiplayer={() => setScreen({ kind: 'multi', code: '' })} onLeaderboard={() => setBoardOpen(true)} onInstall={() => setInstallOpen(true)} onHelp={() => setHelpOpen(true)} daily={loadDaily(today)} dayNumber={dayNumber(today)} stats={stats} />
  } else if (screen.kind === 'play') {
    const { game } = screen
    const index = game.results.length
    const song = game.songs[index]
    const endless = game.mode === 'endless'
    const level = endless ? endlessLevel(index) : Math.round((index / Math.max(1, game.songs.length - 1)) * (DIFFICULTY.length - 1))
    body = (
      <Round
        key={`${index}:${song.id}`}
        catalog={catalog}
        song={song}
        nextSong={game.songs[index + 1]}
        index={index}
        total={endless ? null : game.songs.length}
        level={level}
        runScore={game.results.reduce((sum, r) => sum + r.points, 0)}
        lives={endless ? game.lives : undefined}
        maxLives={ENDLESS_LIVES}
        onNext={next}
        onQuit={quit}
      />
    )
  } else {
    body = (
      <Summary
        run={screen.run}
        mode={screen.mode}
        daily={screen.daily ? dayNumber(screen.daily) : null}
        stats={stats}
        onAgain={screen.mode === 'endless' ? startEndless : startRun}
        onHome={goHome}
        onLeaderboard={() => setBoardOpen(true)}
      />
    )
  }

  return (
    <>
      <Backdrop />
      <Splash ready={Boolean(catalog) || Boolean(error)} />
      <div className="page">
        <header className="topbar">
          <button className="brand" onClick={screen.kind === 'play' ? quit : screen.kind === 'multi' ? undefined : goHome} aria-label="Praise Play home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 18.5a3 3 0 1 1-2-2.83V5.5l12-2.5v12a3 3 0 1 1-2-2.83V7.6l-8 1.7v9.2Z" /></svg>
            </span>
            <span>praise<b>play</b></span>
          </button>
          <div className="top-actions">
            <button className="icon-button" onClick={() => setBoardOpen(true)} aria-label="Leaderboard" title="Leaderboard">🏆</button>
            <button className="icon-button" onClick={() => setHelpOpen(true)} aria-label="How to play (H)" title="How to play (H)">?</button>
            <ThemePicker value={themeId} onChange={changeTheme} />
          </div>
        </header>
        {body}
        {helpOpen && <HelpDialog onClose={closeHelp} />}
        {boardOpen && <LeaderboardDialog onClose={closeBoard} />}
        <InstallPrompt themeId={themeId} onHome={Boolean(catalog) && screen.kind === 'home'} forceOpen={installOpen} onClose={() => setInstallOpen(false)} />
        <footer>Made for music that lifts the spirit <span>✦</span> Previews & artwork courtesy of Apple Music</footer>
      </div>
    </>
  )
}
