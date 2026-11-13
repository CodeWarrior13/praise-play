import { useMemo, useState } from 'react'
import { songs } from '../data/songs'
import { genreGroups, inGroup } from '../data/groups'
import { normalize } from '../lib/daily'
import { YEAR_MAX, YEAR_MIN, artistsByCount, defaultOptions, filterSongs, type RunOptions } from '../lib/run'
import { MAX_POINTS, RUN_LENGTH, WRONG_GUESS_PENALTY, clipWorth, formatPoints } from '../lib/scoring'
import type { RunRecord, Stats } from '../lib/storage'

type Props = {
  options: RunOptions
  onOptions: (options: RunOptions) => void
  onStart: () => void
  onDaily: () => void
  daily: RunRecord | null
  dayNumber: number
  stats: Stats
}

const MAX_ARTISTS = 20

export function Home({ options, onOptions, onStart, onDaily, daily, dayNumber, stats }: Props) {
  const [showOptions, setShowOptions] = useState(false)
  const [artistQuery, setArtistQuery] = useState('')
  const pool = filterSongs(options)
  const allArtists = useMemo(() => artistsByCount(songs), [])
  const artistPool = filterSongs(options, 'artists')
  const genrePool = filterSongs(options, 'groups')

  const set = (patch: Partial<RunOptions>) => onOptions({ ...options, ...patch })
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value])

  const artistMatches = useMemo(() => {
    const q = normalize(artistQuery)
    const counts = new Map(artistsByCount(artistPool).map((a) => [a.name, a.count]))
    return allArtists
      .filter((a) => !q || normalize(a.name).includes(q))
      .map((a) => ({ name: a.name, count: counts.get(a.name) ?? 0 }))
      .filter((a) => a.count > 0 || options.artists.includes(a.name))
      .slice(0, q ? 30 : 16)
  }, [artistQuery, allArtists, artistPool, options.artists])

  const summary = [
    options.groups.length ? genreGroups.filter((g) => options.groups.includes(g.id)).map((g) => g.label).join(', ') : 'All genres',
    options.artists.length ? `${options.artists.length} artist${options.artists.length > 1 ? 's' : ''}` : 'all artists',
    options.yearFrom > YEAR_MIN || options.yearTo < YEAR_MAX ? `${options.yearFrom}–${options.yearTo}` : null,
    options.wellKnownOnly ? 'well-known only' : null,
  ].filter(Boolean).join(' · ')

  return (
    <>
      <section className="hero">
        <p className="eyebrow"><span className="live-dot" /> name the song from 0.1 seconds</p>
        <h1>How little do you <em>need to hear?</em></h1>
        <p className="lede">Hear a sliver of a Christian song, unlock more only if you must, and name it. {RUN_LENGTH} songs a run, from easy to legendary.</p>

        <div className="cta">
          <button className="primary big" onClick={onStart} disabled={pool.length === 0}>Play</button>
          <button className="secondary big" onClick={onDaily}>
            {daily ? <>Day #{dayNumber} · {formatPoints(daily.total)}</> : <>Today’s run #{dayNumber}</>}
          </button>
        </div>
        <p className="pool-count"><strong>{pool.length}</strong> songs in the pool</p>
      </section>

      <section className={`card options${showOptions ? ' open' : ''}`}>
        <button className="options-toggle" onClick={() => setShowOptions((v) => !v)} aria-expanded={showOptions}>
          <span>
            <strong>Run options</strong>
            <span>{summary}</span>
          </span>
          <span className="chevron" aria-hidden="true">⌄</span>
        </button>

        {showOptions && (
          <div className="options-body">
            <div className="option-group">
              <div className="option-label"><span>Genre</span>{options.groups.length > 0 && <button className="text-button" onClick={() => set({ groups: [] })}>All genres</button>}</div>
              <div className="chips">
                <button className={`chip${options.groups.length === 0 ? ' active' : ''}`} onClick={() => set({ groups: [] })}>All genres <small>{genrePool.length}</small></button>
                {genreGroups.map((group) => {
                  const count = genrePool.filter((song) => inGroup(song, group)).length
                  return (
                    <button key={group.id} className={`chip${options.groups.includes(group.id) ? ' active' : ''}`} onClick={() => set({ groups: toggle(options.groups, group.id) })} disabled={count === 0 && !options.groups.includes(group.id)}>
                      {group.label} <small>{count}</small>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="option-group">
              <div className="option-label"><span>Artists</span>{options.artists.length > 0 && <button className="text-button" onClick={() => set({ artists: [] })}>All artists</button>}</div>
              {options.artists.length > 0 && (
                <div className="chips selected-artists">
                  {options.artists.map((name) => <button key={name} className="chip active" onClick={() => set({ artists: toggle(options.artists, name) })}>{name} ✕</button>)}
                </div>
              )}
              <input className="field" value={artistQuery} onChange={(e) => setArtistQuery(e.target.value)} placeholder={`Search ${allArtists.length} artists`} aria-label="Search artists" />
              <div className="chips">
                {artistMatches.map((artist) => (
                  <button key={artist.name} className={`chip${options.artists.includes(artist.name) ? ' active' : ''}`} onClick={() => set({ artists: toggle(options.artists, artist.name) })} disabled={!options.artists.includes(artist.name) && options.artists.length >= MAX_ARTISTS}>
                    {artist.name} <small>{artist.count}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="option-group">
              <div className="option-label"><span>Era</span><span className="era-value">{options.yearFrom} – {options.yearTo}</span></div>
              <div className="era">
                <input type="range" min={YEAR_MIN} max={YEAR_MAX} value={options.yearFrom} onChange={(e) => set({ yearFrom: Math.min(Number(e.target.value), options.yearTo) })} aria-label="From year" />
                <input type="range" min={YEAR_MIN} max={YEAR_MAX} value={options.yearTo} onChange={(e) => set({ yearTo: Math.max(Number(e.target.value), options.yearFrom) })} aria-label="To year" />
              </div>
            </div>

            <div className="option-group">
              <div className="option-label"><span>Songs</span></div>
              <div className="segmented">
                <button className={!options.wellKnownOnly ? 'active' : ''} onClick={() => set({ wellKnownOnly: false })}>All songs</button>
                <button className={options.wellKnownOnly ? 'active' : ''} onClick={() => set({ wellKnownOnly: true })}>Well-known only</button>
              </div>
            </div>

            <button className="text-button reset" onClick={() => onOptions(defaultOptions)}>Reset options</button>
          </div>
        )}
      </section>

      <section className="card how">
        <h2>How it works</h2>
        <ol>
          <li><span className="num">1</span><span>Press play to hear the first <strong>0.1 seconds</strong>.</span></li>
          <li><span className="num">2</span><span>Need more? Drag the bar or tap <strong>0.5s</strong>, <strong>1s</strong>, <strong>3s</strong> or <strong>+1s</strong> to unlock more, up to 30 seconds.</span></li>
          <li><span className="num">3</span><span>Type the title or artist and pick the song from the list.</span></li>
          <li><span className="num">4</span><span>A wrong guess costs {WRONG_GUESS_PENALTY} points, but the song keeps going. Skip to reveal it for 0.</span></li>
        </ol>
        <div className="worth-table">
          {[0.1, 0.5, 1, 3, 10, 30].map((t) => <div key={t}><span>{t}s</span><strong>{formatPoints(clipWorth(t))}</strong></div>)}
        </div>
        <p className="muted">A run is {RUN_LENGTH} songs scored out of {formatPoints(MAX_POINTS * RUN_LENGTH)}. Today’s run is the same {RUN_LENGTH} songs for everyone, so you can compare scores.</p>
      </section>

      {stats.runs > 0 && (
        <section className="card stat-grid">
          <div><strong>{stats.runs}</strong><span>Runs</span></div>
          <div><strong>{formatPoints(stats.best)}</strong><span>Best run</span></div>
          <div><strong>{formatPoints(Math.round(stats.totalPoints / stats.runs))}</strong><span>Average</span></div>
          <div><strong>{stats.fastest !== undefined ? `${stats.fastest}s` : '—'}</strong><span>Fastest</span></div>
        </section>
      )}
    </>
  )
}
