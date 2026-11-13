import { useMemo, useState } from 'react'
import { artUrl, type Catalog, type Song } from '../lib/catalog'
import { normalize } from '../lib/daily'
import { MAX_ARTISTS, defaultOptions, filterSongs, matchesPopularity, type Library, type Popularity, type RunOptions } from '../lib/run'
import { MAX_POINTS, RUN_LENGTH, WRONG_GUESS_PENALTY, clipWorth, formatPoints } from '../lib/scoring'
import { loadSetting, saveSetting, type RunRecord, type Stats } from '../lib/storage'
import { CountUp } from './Fx'

type Props = {
  catalog: Catalog
  options: RunOptions
  onOptions: (options: RunOptions) => void
  onStart: () => void
  onDaily: () => void
  onEndless: () => void
  onMultiplayer: () => void
  onHelp: () => void
  daily: RunRecord | null
  dayNumber: number
  stats: Stats
}

const POPULARITY: { id: Popularity; label: string; hint: string }[] = [
  { id: 'hits', label: 'Hits', hint: 'Songs almost everyone knows' },
  { id: 'all', label: 'Everything', hint: 'Hits and deeper cuts' },
  { id: 'deep', label: 'Deep cuts', hint: 'Album tracks for true fans' },
]

export function Home({ catalog, options, onOptions, onStart, onDaily, onEndless, onMultiplayer, onHelp, daily, dayNumber, stats }: Props) {
  // Returning players don't need the rules spelled out every time.
  const [showHelp] = useState(() => !loadSetting('seenHelp', false) && stats.runs === 0)
  const start = (fn: () => void) => () => { saveSetting('seenHelp', true); fn() }
  const [showOptions, setShowOptions] = useState(false)
  const [artistQuery, setArtistQuery] = useState('')
  const pool = useMemo(() => filterSongs(catalog, options), [catalog, options])
  const genrePool = useMemo(() => filterSongs(catalog, options, 'genres'), [catalog, options])
  const artistPool = useMemo(() => filterSongs(catalog, options, 'artists'), [catalog, options])
  const libraryCounts = useMemo(() => ({
    all: catalog.songs.length,
    mine: catalog.songs.filter((s) => s.mine).length,
    playlist: catalog.songs.filter((s) => s.playlist).length,
  }), [catalog])

  const set = (patch: Partial<RunOptions>) => onOptions({ ...options, ...patch })
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const artistCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const song of artistPool) counts.set(song.artist, (counts.get(song.artist) ?? 0) + 1)
    return counts
  }, [artistPool])

  const artistMatches = useMemo(() => {
    const q = normalize(artistQuery)
    return catalog.artists
      .filter((a) => !q || normalize(a.name).includes(q))
      .map((a) => ({ ...a, count: artistCounts.get(a.name) ?? 0 }))
      .filter((a) => a.count > 0 || options.artists.includes(a.name))
      .sort((a, b) => Number(b.mine) - Number(a.mine) || b.count - a.count)
      .slice(0, q ? 40 : 24)
  }, [artistQuery, catalog, artistCounts, options.artists])

  const yearFrom = options.yearFrom ?? catalog.yearMin
  const yearTo = options.yearTo ?? catalog.yearMax
  const genreLabel = (id: string) => catalog.genres.find((g) => g.id === id)?.label ?? id

  const summary = [
    options.genres.length ? options.genres.map(genreLabel).join(', ') : 'All genres',
    options.library === 'playlist' ? 'your playlist songs' : options.library === 'mine' ? 'your artists' : null,
    options.artists.length ? `${options.artists.length} artist${options.artists.length > 1 ? 's' : ''}` : `${catalog.artists.length} artists`,
    options.yearFrom !== null || options.yearTo !== null ? `${yearFrom}–${yearTo}` : null,
    options.popularity !== 'all' ? POPULARITY.find((p) => p.id === options.popularity)!.label.toLowerCase() : null,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <section className="hero enter">
        <CoverMarquee catalog={catalog} />
        <p className="eyebrow"><span className="live-dot" /> name the song from 0.1 seconds</p>
        <h1>How little do you <span className="gradient-text">need to hear?</span></h1>
        <p className="lede">A split second of Christian music. Unlock more only if you must. {RUN_LENGTH} songs a run, easy to legendary.</p>
        <div className="cta">
          <button className="primary big shine play-main" onClick={start(onStart)} disabled={pool.length === 0}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" /></svg>
            Play <small>5 songs</small>
          </button>
          <button className="ghost big" onClick={start(onEndless)} disabled={pool.length === 0}>
            <span aria-hidden="true">∞</span> Endless
          </button>
          <button className="ghost big" onClick={start(onDaily)}>
            {daily ? <>Daily #{dayNumber} · <CountUp value={daily.total} /></> : <>Daily #{dayNumber}</>}
          </button>
          <button className="ghost big" onClick={start(onMultiplayer)}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm7.5 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM2 20c0-3.3 3.1-6 7-6s7 2.7 7 6H2Zm15.5 0c0-1.9-.7-3.6-1.9-4.9.6-.1 1.2-.1 1.9-.1 2.8 0 4.5 1.8 4.5 5h-4.5Z" /></svg>
            Friends
          </button>
        </div>
        <p className="pool-count"><strong><CountUp value={pool.length} duration={500} /></strong> songs in the pool</p>
      </section>

      <section className={`card options enter${showOptions ? ' open' : ''}`} style={{ animationDelay: '80ms' }}>
        <button className="options-toggle" onClick={() => setShowOptions((v) => !v)} aria-expanded={showOptions}>
          <span className="options-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4 7h10.2a3 3 0 0 1 5.6 0H20v2h-.2a3 3 0 0 1-5.6 0H4V7Zm13 1a1 1 0 1 0 0-.01V8ZM4 15h.2a3 3 0 0 1 5.6 0H20v2H9.8a3 3 0 0 1-5.6 0H4v-2Zm3 1a1 1 0 1 0 0-.01V16Z" /></svg>
          </span>
          <span className="options-title">
            <strong>Run options</strong>
            <span>{summary}</span>
          </span>
          <span className="chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="m7 10 5 5 5-5H7Z" /></svg>
          </span>
        </button>

        <div className="collapse">
          <div className="collapse-inner">
            <div className="options-body">
              <div className="option-group">
                <div className="option-label"><span>Popularity</span></div>
                <div className="segmented three">
                  {POPULARITY.map((p) => (
                    <button key={p.id} className={options.popularity === p.id ? 'active' : ''} onClick={() => set({ popularity: p.id })} title={p.hint}>
                      {p.label}
                      <small>{catalog.songs.filter((s) => matchesPopularity(s, p.id)).length.toLocaleString()}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <div className="option-label"><span>Song library</span></div>
                <div className="segmented three library">
                  {([
                    ['all', 'Everyone', libraryCounts.all],
                    ['mine', 'Your artists', libraryCounts.mine],
                    ['playlist', 'Your playlists', libraryCounts.playlist],
                  ] as [Library, string, number][]).map(([id, label, count]) => (
                    <button key={id} className={options.library === id ? 'active' : ''} onClick={() => set({ library: id })}>
                      {id !== 'all' && <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.4a.6.6 0 0 1-.9.2c-2.4-1.5-5.4-1.8-9-1a.6.6 0 1 1-.3-1.2c3.9-.9 7.2-.5 9.9 1.1.3.2.4.6.3.9Zm1.2-2.7a.8.8 0 0 1-1 .3c-2.7-1.7-6.9-2.2-10.2-1.2a.8.8 0 1 1-.4-1.5c3.7-1.1 8.3-.6 11.4 1.4.3.2.4.7.2 1Zm.1-2.8C14.6 9 9.2 8.8 6.1 9.7a.9.9 0 1 1-.5-1.8c3.6-1.1 9.5-.9 13.2 1.3a.9.9 0 0 1-.9 1.7Z" /></svg>}
                      {label}
                      <small>{count.toLocaleString()}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <div className="option-label"><span>Genre</span>{options.genres.length > 0 && <button className="text-button" onClick={() => set({ genres: [] })}>Clear</button>}</div>
                <div className="chips">
                  <button className={`chip${options.genres.length === 0 ? ' active' : ''}`} onClick={() => set({ genres: [] })}>All genres <small>{genrePool.length}</small></button>
                  {catalog.genres.map((genre) => {
                    const count = genrePool.filter((song) => song.genres.includes(genre.id)).length
                    const active = options.genres.includes(genre.id)
                    return (
                      <button key={genre.id} className={`chip${active ? ' active' : ''}`} onClick={() => set({ genres: toggle(options.genres, genre.id) })} disabled={count === 0 && !active}>
                        {genre.label} <small>{count}</small>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="option-group">
                <div className="option-label">
                  <span>Artists {options.artists.length > 0 && <em>{options.artists.length}/{MAX_ARTISTS}</em>}</span>
                  {options.artists.length > 0 && <button className="text-button" onClick={() => set({ artists: [] })}>All artists</button>}
                </div>
                {options.artists.length > 0 && (
                  <div className="chips selected-artists">
                    {options.artists.map((name) => <button key={name} className="chip active" onClick={() => set({ artists: toggle(options.artists, name) })}>{name} <span aria-hidden="true">✕</span></button>)}
                  </div>
                )}
                <input className="field" value={artistQuery} onChange={(e) => setArtistQuery(e.target.value)} placeholder={`Search ${catalog.artists.length} artists`} aria-label="Search artists" />
                <div className="chips artist-chips">
                  {artistMatches.map((artist) => (
                    <button key={artist.name} className={`chip${options.artists.includes(artist.name) ? ' active' : ''}${artist.mine ? ' mine' : ''}`} onClick={() => set({ artists: toggle(options.artists, artist.name) })} disabled={!options.artists.includes(artist.name) && options.artists.length >= MAX_ARTISTS}>
                      {artist.mine && <span className="dot" aria-label="Your Spotify artist" />}{artist.name} <small>{artist.count}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-group">
                <div className="option-label"><span>Era</span><span className="era-value">{yearFrom} – {yearTo}</span></div>
                <div className="era" style={{ '--from': `${((yearFrom - catalog.yearMin) / (catalog.yearMax - catalog.yearMin)) * 100}%`, '--to': `${((yearTo - catalog.yearMin) / (catalog.yearMax - catalog.yearMin)) * 100}%` } as React.CSSProperties}>
                  <div className="era-track"><span /></div>
                  <input type="range" min={catalog.yearMin} max={catalog.yearMax} value={yearFrom} onChange={(e) => { const v = Math.min(Number(e.target.value), yearTo); set({ yearFrom: v <= catalog.yearMin ? null : v }) }} aria-label="From year" />
                  <input type="range" min={catalog.yearMin} max={catalog.yearMax} value={yearTo} onChange={(e) => { const v = Math.max(Number(e.target.value), yearFrom); set({ yearTo: v >= catalog.yearMax ? null : v }) }} aria-label="To year" />
                </div>
                <div className="decades">
                  {[1980, 1990, 2000, 2010, 2020].map((decade) => (
                    <button key={decade} className={`chip small${options.yearFrom === decade && options.yearTo === decade + 9 ? ' active' : ''}`} onClick={() => set({ yearFrom: Math.max(decade, catalog.yearMin), yearTo: Math.min(decade + 9, catalog.yearMax) })}>
                      {String(decade).slice(2)}s
                    </button>
                  ))}
                </div>
              </div>

              <button className="text-button reset" onClick={() => onOptions(defaultOptions)}>Reset all options</button>
            </div>
          </div>
        </div>
      </section>

      {!showHelp ? (
        <button className="help-link enter" style={{ animationDelay: '140ms' }} onClick={onHelp}>How to play &amp; scoring <kbd>H</kbd></button>
      ) : (
      <section className="card how enter" style={{ animationDelay: '140ms' }}>
        <h2>How it works</h2>
        <ol>
          <li><span className="num">1</span><span>Press play to hear the first <strong>0.1 seconds</strong>.</span></li>
          <li><span className="num">2</span><span>Need more? Drag the bar or tap <strong>0.5s</strong>, <strong>1s</strong>, <strong>3s</strong> or <strong>+1s</strong> — up to 30 seconds.</span></li>
          <li><span className="num">3</span><span>Type the title or artist and pick the song.</span></li>
          <li><span className="num">4</span><span>A wrong guess costs {WRONG_GUESS_PENALTY} points but the song keeps going. Skip reveals it for 0.</span></li>
        </ol>
        <div className="worth-table">
          {[0.1, 0.5, 1, 3, 10, 30].map((t, i) => <div key={t} style={{ '--i': i } as React.CSSProperties}><span>{t}s</span><strong>{formatPoints(clipWorth(t))}</strong></div>)}
        </div>
        <p className="muted">{RUN_LENGTH} songs a run, scored out of {formatPoints(MAX_POINTS * RUN_LENGTH)}. Endless keeps going until you skip 3 songs. Today’s run is the same for everyone. {catalog.songs.length.toLocaleString()} songs from {catalog.artists.length} artists.</p>
      </section>
      )}

      {(stats.runs > 0 || (stats.bestEndless ?? 0) > 0) && (
        <section className="card stat-grid enter" style={{ animationDelay: '200ms' }}>
          <div><strong><CountUp value={stats.runs} /></strong><span>Runs</span></div>
          <div><strong><CountUp value={stats.best} /></strong><span>Best run</span></div>
          <div><strong>{stats.runs ? <CountUp value={Math.round(stats.totalPoints / stats.runs)} /> : '—'}</strong><span>Average</span></div>
          <div><strong>{stats.bestEndless ? <CountUp value={stats.bestEndless} /> : '—'}</strong><span>Endless best</span></div>
        </section>
      )}
    </>
  )
}

/** A slow, endless strip of album covers from the biggest songs. Purely decorative. */
function CoverMarquee({ catalog }: { catalog: Catalog }) {
  const covers = useMemo(() => {
    const picks: string[] = []
    const seen = new Set<string>()
    const ranked: Song[] = [...catalog.songs].sort((a, b) => b.popularity - a.popularity)
    for (const song of ranked) {
      const url = artUrl(song, 160)
      if (!url || seen.has(song.artist) || song.genres.includes('instrumental') || song.genres.includes('christmas')) continue
      seen.add(song.artist)
      picks.push(url)
      if (picks.length === 16) break
    }
    return picks
  }, [catalog])
  if (covers.length < 6) return <div className="marquee placeholder" aria-hidden="true" />
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[...covers, ...covers].map((src, i) => <img key={i} src={src} alt="" loading="lazy" />)}
      </div>
    </div>
  )
}
