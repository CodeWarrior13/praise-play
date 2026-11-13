import { useEffect, useMemo, useRef, useState } from 'react'
import { artUrl, type Catalog, type Song } from '../lib/catalog'
import { normalize } from '../lib/daily'
import { isPaused } from '../lib/pause'

type Props = { catalog: Catalog; excluded: Set<string>; onGuess: (song: Song) => void; onSkip: () => void; skipLabel?: string; shake: number }

const MAX_SONG_RESULTS = 8
const MAX_ARTIST_SONGS = 40
const SHORTCUT_KEYS = new Set(['a', 'd', 'h'])

/**
 * Search the whole catalog by title or artist. Typing an artist's name lists their
 * songs under an artist header, most popular first.
 */
export function GuessBox({ catalog, excluded, onGuess, onSkip, skipLabel = 'Skip', shake }: Props) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Start typing anywhere to search. A, D and H are game shortcuts, so "/" or Enter
  // jumps to the box for searches that start with those letters.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.metaKey || event.ctrlKey || event.altKey || isPaused()) return
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      if (event.key === '/' || (event.key === 'Enter' && !(target instanceof HTMLButtonElement))) {
        event.preventDefault()
        inputRef.current?.focus()
        return
      }
      if (event.key.length !== 1 || event.key === ' ' || SHORTCUT_KEYS.has(event.key.toLowerCase())) return
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { artist, matches } = useMemo(() => {
    const q = normalize(query)
    if (!q) return { artist: null, matches: [] as Song[] }
    const words = q.split(' ')
    // An artist whose name starts with (or equals) the query gets a header and their songs.
    const artist = q.length >= 2 ? catalog.artists.find((a) => normalize(a.name) === q) ?? catalog.artists.find((a) => normalize(a.name).startsWith(q) && q.length >= 3) ?? null : null
    const found: Song[] = []
    for (const song of catalog.songs) {
      if (excluded.has(song.id)) continue
      if (words.every((word) => song.search.includes(word))) found.push(song)
    }
    const titleStarts = (song: Song) => normalize(song.title).startsWith(q)
    const byArtist = (song: Song) => (artist && song.artist === artist.name ? 1 : 0)
    found.sort((a, b) => byArtist(b) - byArtist(a) || Number(titleStarts(b)) - Number(titleStarts(a)) || b.popularity - a.popularity)
    return { artist, matches: found.slice(0, artist ? MAX_ARTIST_SONGS : MAX_SONG_RESULTS) }
  }, [query, catalog, excluded])

  function pick(song: Song) {
    onGuess(song)
    setQuery('')
    setOpen(false)
    setHighlight(0)
  }

  function move(delta: number) {
    setOpen(true)
    setHighlight((h) => {
      const next = Math.max(0, Math.min(matches.length - 1, h + delta))
      listRef.current?.children[next + (artist ? 1 : 0)]?.scrollIntoView({ block: 'nearest' })
      return next
    })
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(1) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1) }
    else if (event.key === 'Escape') { setOpen(false); (event.target as HTMLInputElement).blur() }
    else if (event.key === 'Enter' && matches[highlight]) { event.preventDefault(); pick(matches[highlight]) }
  }

  const artistSongCount = artist ? catalog.songs.filter((s) => s.artist === artist.name).length : 0

  return (
    <div className="guess">
      <div className="search" key={shake} data-shake={shake > 0 || undefined}>
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M10.5 4a6.5 6.5 0 0 1 5.2 10.4l4.4 4.4-1.4 1.4-4.4-4.4A6.5 6.5 0 1 1 10.5 4Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" /></svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlight(0); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          placeholder="Song or artist…"
          aria-label="Search for a song by title or artist"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="song-options"
          aria-activedescendant={matches[highlight] ? `opt-${matches[highlight].id}` : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
        />
        {query && <button className="clear" onClick={() => setQuery('')} aria-label="Clear search">✕</button>}
        {open && matches.length > 0 && (
          <ul className="suggestions" id="song-options" role="listbox" ref={listRef}>
            {artist && (
              <li className="artist-head" role="presentation">
                <span className="artist-avatar" aria-hidden="true">{artist.name.slice(0, 1)}</span>
                <span><strong>{artist.name}</strong><small>{artistSongCount} songs{artistSongCount > MAX_ARTIST_SONGS ? ` · top ${MAX_ARTIST_SONGS} shown` : ''}</small></span>
              </li>
            )}
            {matches.map((song, index) => {
              const cover = artUrl(song, 100)
              return (
                <li
                  key={song.id}
                  id={`opt-${song.id}`}
                  role="option"
                  aria-selected={index === highlight}
                  className={index === highlight ? 'highlight' : ''}
                  style={{ animationDelay: `${Math.min(index, 10) * 16}ms` }}
                  onMouseDown={(e) => { e.preventDefault(); pick(song) }}
                  onMouseEnter={() => setHighlight(index)}
                >
                  {cover ? <img src={cover} alt="" width={40} height={40} loading="lazy" /> : <span className="thumb-blank" aria-hidden="true">♪</span>}
                  <span className="sugg-text">
                    <strong>{song.title}</strong>
                    <span>{song.artist}{song.year ? ` · ${song.year}` : ''}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {open && query.trim().length > 1 && matches.length === 0 && <div className="suggestions none">No songs match “{query.trim()}”.</div>}
      </div>
      <button className="ghost skip" onClick={onSkip}>{skipLabel}</button>
    </div>
  )
}
