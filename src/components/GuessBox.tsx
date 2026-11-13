import { useMemo, useState } from 'react'
import type { Song } from '../lib/catalog'
import { normalize } from '../lib/daily'

type Props = { songs: Song[]; excluded: Set<string>; onGuess: (song: Song) => void; onSkip: () => void; shake: number }

/** Search the whole catalog by title or artist and pick a song. */
export function GuessBox({ songs, excluded, onGuess, onSkip, shake }: Props) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const q = normalize(query)
    if (!q) return []
    const words = q.split(' ')
    const found: Song[] = []
    for (const song of songs) {
      if (excluded.has(song.id)) continue
      if (words.every((word) => song.search.includes(word))) found.push(song)
    }
    const titleStarts = (song: Song) => normalize(song.title).startsWith(q)
    return found
      .sort((a, b) => Number(titleStarts(b)) - Number(titleStarts(a)) || b.popularity - a.popularity)
      .slice(0, 8)
  }, [query, songs, excluded])

  function pick(song: Song) {
    onGuess(song)
    setQuery('')
    setOpen(false)
    setHighlight(0)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setHighlight((h) => Math.min(h + 1, matches.length - 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)) }
    else if (event.key === 'Escape') setOpen(false)
    else if (event.key === 'Enter' && matches[highlight]) { event.preventDefault(); pick(matches[highlight]) }
  }

  return (
    <div className="guess">
      <div className="search" key={shake} data-shake={shake > 0 || undefined}>
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M10.5 4a6.5 6.5 0 0 1 5.2 10.4l4.4 4.4-1.4 1.4-4.4-4.4A6.5 6.5 0 1 1 10.5 4Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" /></svg>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlight(0); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Name that song…"
          aria-label="Search for a song by title or artist"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="song-options"
          autoComplete="off"
          spellCheck={false}
        />
        {open && matches.length > 0 && (
          <ul className="suggestions" id="song-options" role="listbox">
            {matches.map((song, index) => (
              <li key={song.id} role="option" aria-selected={index === highlight} className={index === highlight ? 'highlight' : ''} style={{ animationDelay: `${index * 18}ms` }} onMouseDown={(e) => { e.preventDefault(); pick(song) }} onMouseEnter={() => setHighlight(index)}>
                <strong>{song.title}</strong> <span>{song.artist}</span>
              </li>
            ))}
          </ul>
        )}
        {open && query.trim().length > 1 && matches.length === 0 && <div className="suggestions none">No songs match “{query.trim()}”.</div>}
      </div>
      <button className="ghost skip" onClick={onSkip}>Skip</button>
    </div>
  )
}
