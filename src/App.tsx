import { useCallback, useEffect, useState, useMemo } from 'react'
import { loadCatalog, loadChristmasCatalog, withChristmas, type Catalog, type Song } from './lib/catalog'
import { christmasAvailable, seasonYear } from './lib/seasonal'
import { startAnalytics, trackGame } from './lib/analytics'
import { StatsDashboard } from './components/StatsDashboard'
import { ChristmasLights } from './components/ChristmasLights'
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
import { ShareButton } from './components/ShareButton'
import { onShortcut, typingInField } from './lib/keys'
import { loadSetting, saveSetting } from './lib/storage'
import { SoloSetup, type SoloSettings } from './components/SoloSetup'
import { ResultsCard } from './components/ResultsCard'
import { readSharedRun, type SharedRun } from './lib/shareRun'
import { poolForDifficulty } from './lib/difficulty'
import { recentSongs, rememberSongs } from './lib/recent'

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
  /** Solo setup the game was started with (for Play again and the leaderboard). */
  setup?: SoloSettings
  /** Played from the Christmas songs. */
  christmas?: boolean
}

type Screen = { kind: 'home' } | { kind: 'stats' } | { kind: 'card'; shared: SharedRun } | { kind: 'multi'; code: string } | { kind: 'play'; game: Game } | { kind: 'summary'; run: RunRecord; mode: Mode; daily: string | null; setup?: SoloSettings; christmas?: boolean }

const scored = (results: SongResult[]) => results.filter((r) => r.outcome !== 'unavailable')

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<RunOptions>(loadOptions)
  // Invite links look like ?room=ABCDE and open the multiplayer join screen.
  const [screen, setScreen] = useState<Screen>(() => {
    const params = new URLSearchParams(location.search)
    const code = params.get('room')
    const shared = readSharedRun(params.get('r'))
    if (/\/stats\/?$/.test(location.pathname) || params.has('stats')) return { kind: 'stats' }
    return code ? { kind: 'multi', code } : shared ? { kind: 'card', shared } : { kind: 'home' }
  })
  const [stats, setStats] = useState(loadStats)
  const [themeId, setThemeId] = useState(loadThemeId)
  const [helpOpen, setHelpOpen] = useState(false)
  const [boardOpen, setBoardOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [setupMode, setSetupMode] = useState<'run' | 'endless' | null>(null)
  const closeSetup = useCallback(() => setSetupMode(null), [])
  const [soloSettings, setSoloSettings] = useState<SoloSettings>(() => loadSetting<SoloSettings>('soloSetup', { count: 5, difficulty: 'mixed' }))
  function rememberSolo(setup: SoloSettings) { setSoloSettings(setup); saveSetting('soloSetup', setup) }
  const closeBoard = useCallback(() => setBoardOpen(false), [])
  // Christmas mode: hidden until it drops (see src/lib/seasonal.ts).
  const [xmasReady] = useState(christmasAvailable)
  // Switches itself on the first time each season; after that it remembers the player's choice.
  const [xmasOn, setXmasOn] = useState(() => {
    if (!xmasReady) return false
    const saved = loadSetting<{ season: number; on: boolean } | boolean | null>('christmasMode', null)
    return saved && typeof saved === 'object' && saved.season === seasonYear() ? saved.on : true
  })
  useEffect(() => {
    if (xmasReady && xmasOn && loadSetting<{ season: number } | null>('christmasMode', null)?.season !== seasonYear()) {
      saveSetting('christmasMode', { season: seasonYear(), on: true })
      if (themeId !== 'christmas') { saveSetting('themeBeforeChristmas', themeId); changeTheme('christmas') }
    }
    // Season over: put the player's own theme back.
    if (!xmasReady && themeId === 'christmas') changeTheme(loadSetting('themeBeforeChristmas', 'sanctuary'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [xmasCatalog, setXmasCatalog] = useState<Catalog | null>(null)
  const needXmas = xmasOn || screen.kind === 'multi' || (screen.kind === 'card' && screen.shared.christmas)
  useEffect(() => {
    if (needXmas && !xmasCatalog) loadChristmasCatalog().then(setXmasCatalog, () => setXmasOn(false))
  }, [needXmas, xmasCatalog])
  const today = localDateKey()
  // Friends rooms look songs up in both lists, so a host's Christmas room works for every guest.
  const multiCatalog = useMemo(() => (catalog ? withChristmas(catalog, xmasCatalog) : null), [catalog, xmasCatalog])

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

  // A friend's Christmas room: guests get the Christmas look while they're in it (nothing is saved).
  const [roomXmas, setRoomXmas] = useState(false)
  useEffect(() => { if (screen.kind !== 'multi') setRoomXmas(false) }, [screen.kind])
  useEffect(() => { applyTheme(findTheme(roomXmas && !xmasOn ? 'christmas' : themeId)) }, [themeId, roomXmas, xmasOn])
  useEffect(() => { if (screen.kind !== 'stats') startAnalytics() }, [screen.kind])

  useEffect(() => {
    loadCatalog().then((loaded) => {
      // Drop saved genre filters that no longer exist (e.g. Latin was removed).
      setOptions((current) => {
        const genres = current.genres.filter((id) => loaded.genres.some((g) => g.id === id))
        // Hits/Deep cuts moved into the Difficulty picker; old saved values are dropped.
        return genres.length === current.genres.length && current.popularity === 'all' ? current : { ...current, genres, popularity: 'all' }
      })
      setCatalog(loaded)
    }, (e: Error) => setError(e.message))
  }, [])

  function changeTheme(id: string) {
    setThemeId(id)
    saveThemeId(id)
  }

  function toggleChristmas() {
    const on = !xmasOn
    setXmasOn(on)
    saveSetting('christmasMode', { season: seasonYear(), on })
    if (on) {
      if (themeId !== 'christmas') saveSetting('themeBeforeChristmas', themeId)
      changeTheme('christmas')
    } else if (themeId === 'christmas') {
      changeTheme(loadSetting('themeBeforeChristmas', 'sanctuary'))
    }
  }

  /** Songs a solo game draws from: the Christmas songs in Christmas mode, else the Run options. */
  function soloPool(): Song[] {
    if (!catalog) return []
    if (xmasOn) return xmasCatalog?.songs ?? []
    return filterSongs(catalog, options)
  }

  const catalogFor = (game: { christmas?: boolean }) => (game.christmas && xmasCatalog ? xmasCatalog : catalog!)

  function changeOptions(next: RunOptions) {
    setOptions(next)
    saveOptions(next)
  }

  function begin(game: Game) {
    rememberSongs(game.songs.map((s) => s.id))
    prefetchPreviews(game.songs.slice(0, 6))
    setScreen({ kind: 'play', game })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startRun(setup: SoloSettings = soloSettings) {
    if (!catalog) return
    rememberSolo(setup)
    const pool = poolForDifficulty(soloPool(), setup.difficulty)
    // Steer around recently heard songs, so the same ones don't keep coming back.
    const songs = buildRun(pool, Math.random, setup.count, recentSongs())
    if (songs.length) begin({ mode: 'run', songs, results: [], pool, daily: null, lives: ENDLESS_LIVES, setup, christmas: xmasOn })
  }

  function startDaily() {
    if (!catalog) return
    const finished = loadDaily(today)
    if (finished) { setScreen({ kind: 'summary', run: finished, mode: 'daily', daily: today }); return }
    begin({ mode: 'daily', songs: dailyRun(catalog, today), results: [], pool: catalog.songs, daily: today, lives: ENDLESS_LIVES })
  }

  function startEndless(setup: SoloSettings = soloSettings) {
    if (!catalog) return
    rememberSolo(setup)
    const pool = poolForDifficulty(soloPool(), setup.difficulty)
    const avoid = recentSongs()
    const first = endlessSong(pool, 0, new Set(), avoid)
    const second = first && endlessSong(pool, 1, new Set([first.id]), avoid)
    if (first) begin({ mode: 'endless', songs: second ? [first, second] : [first], results: [], pool, daily: null, lives: ENDLESS_LIVES, setup, christmas: xmasOn })
  }

  function finishGame(game: Game, results: SongResult[]) {
    trackGame(game.christmas ? 'christmas' : game.mode)
    const counted = scored(results)
    const run: RunRecord = { total: counted.reduce((sum, r) => sum + r.points, 0), results: counted }
    if (game.mode === 'endless') setStats(recordEndless(run.total, counted.filter((r) => r.outcome === 'named').length))
    else setStats(recordRun(run))
    if (game.daily) saveDaily(game.daily, run)
    setScreen({ kind: 'summary', run, mode: game.mode, daily: game.daily, setup: game.setup, christmas: game.christmas })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Swap a song whose audio is unavailable for a similar one, without scoring it. */
  function replacement(game: Game, index: number): Song | undefined {
    const used = new Set(game.songs.map((s) => s.id))
    const target = game.songs[index].popularity
    const options = game.pool.filter((s) => !used.has(s.id) && (game.christmas || !s.genres.includes('christmas')))
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
      const upcoming = endlessSong(game.pool, game.songs.length, played, recentSongs())
      const songs = upcoming ? [...game.songs, upcoming] : game.songs
      if (results.length >= songs.length) { finishGame(game, results); return }
      if (upcoming) { prefetchPreviews([upcoming]); rememberSongs([upcoming.id]) }
      setScreen({ kind: 'play', game: { ...game, results, songs, lives } })
      return
    }

    if (results.length < game.songs.length) setScreen({ kind: 'play', game: { ...game, results } })
    else finishGame(game, results)
  }

  const goHome = () => { if (/\/stats\/?$/.test(location.pathname)) history.replaceState(null, '', '/'); setScreen({ kind: 'home' }) }

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
  } else if (screen.kind === 'stats') {
    body = <StatsDashboard />
  } else if (screen.kind === 'card') {
    body = <ResultsCard shared={screen.shared} catalog={screen.shared.christmas ? xmasCatalog ?? catalog : catalog} onPlay={() => { history.replaceState(null, '', location.pathname); goHome() }} />
  } else if (screen.kind === 'multi') {
    body = <Multiplayer catalog={multiCatalog ?? catalog} songsCatalog={catalog} onRoomChristmas={setRoomXmas} christmasPool={xmasReady && xmasOn ? xmasCatalog?.songs : undefined} options={options} initialCode={screen.code} onExit={goHome} />
  } else if (screen.kind === 'home') {
    body = <Home catalog={catalog} options={options} onOptions={changeOptions} onStart={() => setSetupMode('run')} onDaily={startDaily} onEndless={() => setSetupMode('endless')} onMultiplayer={() => setScreen({ kind: 'multi', code: '' })} onLeaderboard={() => setBoardOpen(true)} onInstall={() => setInstallOpen(true)} onHelp={() => setHelpOpen(true)} daily={loadDaily(today)} dayNumber={dayNumber(today)} stats={stats} christmas={xmasReady ? { on: xmasOn, loading: xmasOn && !xmasCatalog, count: xmasCatalog?.songs.length ?? 0, onToggle: toggleChristmas } : undefined} />
  } else if (screen.kind === 'play') {
    const { game } = screen
    const index = game.results.length
    const song = game.songs[index]
    const endless = game.mode === 'endless'
    const level = endless ? endlessLevel(index) : Math.round((index / Math.max(1, game.songs.length - 1)) * (DIFFICULTY.length - 1))
    body = (
      <Round
        key={`${index}:${song.id}`}
        catalog={catalogFor(game)}
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
        setup={screen.setup}
        catalog={catalogFor(screen)}
        christmas={screen.christmas}
        onAgain={() => (screen.mode === 'endless' ? startEndless(screen.setup) : startRun(screen.setup))}
        onHome={goHome}
        onLeaderboard={() => setBoardOpen(true)}
      />
    )
  }

  return (
    <>
      <Backdrop />
      {(xmasOn || roomXmas) && <ChristmasLights />}
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
            <ShareButton catalog={catalog} christmas={xmasReady && xmasOn ? xmasCatalog : null} />
            <button className="icon-button" onClick={() => setBoardOpen(true)} aria-label="Leaderboard" title="Leaderboard">🏆</button>
            <button className="icon-button" onClick={() => setHelpOpen(true)} aria-label="How to play (H)" title="How to play (H)">?</button>
            <ThemePicker value={themeId} onChange={changeTheme} onSecret={() => { history.pushState(null, '', '/stats'); setScreen({ kind: 'stats' }) }} />
          </div>
        </header>
        {body}
        {helpOpen && <HelpDialog onClose={closeHelp} />}
        {boardOpen && <LeaderboardDialog onClose={closeBoard} />}
        {setupMode && catalog && <SoloSetup mode={setupMode} pool={soloPool()} initial={soloSettings} onClose={closeSetup} onStart={(s) => { setSetupMode(null); if (setupMode === 'endless') startEndless(s); else startRun(s) }} />}
        <InstallPrompt themeId={themeId} onHome={Boolean(catalog) && screen.kind === 'home'} forceOpen={installOpen} onClose={() => setInstallOpen(false)} />
        <footer>Made for music that lifts the spirit <span>✦</span> Previews & artwork courtesy of Apple Music <span>✦</span> Anonymous play stats (rough location, time played) help improve the game</footer>
      </div>
    </>
  )
}
