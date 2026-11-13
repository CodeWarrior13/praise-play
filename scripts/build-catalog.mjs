#!/usr/bin/env node
/**
 * Builds public/catalog.json from the artist roster in scripts/artists.mjs.
 *
 * For each artist it asks the iTunes Search API for up to 200 of their songs.
 * Apple returns these roughly in popularity order, which becomes each song's
 * popularity rank. Live/remix/instrumental duplicates are merged into one
 * entry per song title, and the earliest release year is kept.
 *
 *   npm run catalog            # uses cached responses when present
 *   npm run catalog -- --fresh # re-downloads everything
 *
 * Behind a proxy, run with NODE_USE_ENV_PROXY=1 (Node 22.21+).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { artists, GENRES } from './artists.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = join(root, 'scripts', '.cache')
const outFile = join(root, 'public', 'catalog.json')
const fresh = process.argv.includes('--fresh')
const DELAY_MS = 3200 // Apple allows roughly 20 requests a minute.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const CHRISTIAN_GENRE = /christian|gospel|praise|worship|inspirational|ccm|christmas|holiday/i
const JUNK_VERSION = /\b(instrumental|karaoke|backing track|accompaniment|performance track|split track|remix|re-?mixed|sped up|slowed|8d audio|nightcore|lo-?fi|commentary|interview|medley|minus one|reprise|spontaneous|demo|voice memo|vocal track|piano version|cover)\b/i
const FOREIGN_VERSION = /\b(spanish|español|espanol|portugu[eê]s|en español|french|korean|german|italian)\b/i
const NOT_A_SONG = /^(intro|interlude|outro|prelude|skit|welcome|benediction)\b/i
const VERSION_WORDS = /\b(live|feat\.?|ft\.?|featuring|with|version|edit|remaster(ed)?|radio|single|studio|acoustic|deluxe|bonus|mono|stereo|from|session|sessions|mix|recorded|anniversary|edition|reimagined|extended|unplugged|stripped|original|bonus track)\b/i

const CHRISTMAS = /christmas|silent night|holy night|joy to the world|hark the herald|come all ye faithful|go tell it on the mountain|little drummer boy|mary,? did you know|away in a manger|what child is this|angels we have heard|god rest ye|first no[eë]l|o come,? o come,? emmanuel|emmanuel \(christmas|carol of the bells|o little town of bethlehem|it came upon the midnight|we three kings|feliz navidad|white christmas|noel\b/i
const HYMNS = [
  'amazing grace', 'how great thou art', 'it is well', 'it is well with my soul', 'great is thy faithfulness', 'holy holy holy',
  'be thou my vision', 'come thou fount', 'come thou fount of every blessing', 'nothing but the blood', 'the old rugged cross',
  'blessed assurance', 'crown him with many crowns', 'in christ alone', 'before the throne of god above', 'jesus paid it all',
  'ill fly away', 'what a friend we have in jesus', 'rock of ages', 'turn your eyes upon jesus', 'because he lives', 'doxology',
  'abide with me', 'when i survey the wondrous cross', 'all hail the power of jesus name', 'just as i am', 'jesus loves me',
  'softly and tenderly', 'down to the river to pray', 'christ the lord is risen today', 'his eye is on the sparrow',
  'victory in jesus', 'leaning on the everlasting arms', 'nearer my god to thee', 'be still my soul', 'how firm a foundation',
  'it is well with my soul', 'there is power in the blood', 'standing on the promises', 'i surrender all', 'to god be the glory',
  'and can it be', 'o for a thousand tongues', 'all creatures of our god and king', 'praise to the lord the almighty',
  'this is my fathers world', 'the solid rock', 'my hope is built', 'when the roll is called up yonder', 'shall we gather at the river',
  'i need thee every hour', 'are you washed in the blood', 'were you there', 'sweet hour of prayer', 'how sweet the name of jesus sounds',
  'man of sorrows', 'living he loved me', 'his mercy is more', 'o praise the name', 'the love of god',
]

function normName(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[&+]/g, ' and ').replace(/\s+/g, ' ').trim()
}

function normTitle(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
}

/** "Graves Into Gardens (feat. Brandon Lake) [Live]" → "Graves Into Gardens" */
function cleanTitle(title) {
  let clean = title
  // Remove bracketed parts that only describe the version.
  for (let i = 0; i < 3; i++) clean = clean.replace(/\s*[([]([^()[\]]*)[)\]]/g, (match, inner) => (VERSION_WORDS.test(inner) ? '' : match))
  // "Song - Live at ..." / "Song - Radio Version"
  clean = clean.replace(/\s+[-–—]\s+(.*)$/, (match, tail) => (VERSION_WORDS.test(tail) ? '' : match))
  return clean.replace(/\s+/g, ' ').trim()
}

function creditMatches(artistName, rosterName) {
  const a = normName(artistName)
  const n = normName(rosterName)
  if (a === n) return true
  if (!a.startsWith(n)) return false
  return /^(\s*,|\s+and\s|\s+x\s|\s+feat|\s+ft\b|\s+with\s|\s*\()/.test(a.slice(n.length))
}

const slug = (artist, suffix = '') => join(cacheDir, `${normTitle(artist.name).replace(/ /g, '-') || 'artist'}${suffix}.json`)

async function cachedGet(url, cacheFile) {
  if (!fresh && existsSync(cacheFile)) return { data: JSON.parse(await readFile(cacheFile, 'utf8')), cached: true }
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url)
      if (response.status === 403 || response.status === 429 || response.status >= 500) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      await writeFile(cacheFile, JSON.stringify(data))
      return { data, cached: false }
    } catch (error) {
      const wait = 15_000 * (attempt + 1)
      console.warn(`  ${url}: ${error.message}; retrying in ${wait / 1000}s`)
      await sleep(wait)
    }
  }
  throw new Error(`Could not fetch ${url}`)
}

function fetchArtist(artist) {
  const params = new URLSearchParams({ term: artist.name, entity: 'song', attribute: 'artistTerm', limit: '200', country: 'US' })
  return cachedGet(`https://itunes.apple.com/search?${params}`, slug(artist))
}

/**
 * For generic names ("Passion", "Red") the keyword search is swamped by other
 * artists. Find the artist's own Apple ID, then list their songs directly;
 * Apple returns those in popularity order too.
 */
async function fetchArtistById(artist) {
  const params = new URLSearchParams({ term: artist.name, entity: 'musicArtist', limit: '25', country: 'US' })
  const found = await cachedGet(`https://itunes.apple.com/search?${params}`, slug(artist, '.artist'))
  const candidates = (found.data.results ?? []).filter((r) => normName(r.artistName) === normName(artist.name))
  const best = candidates.find((r) => CHRISTIAN_GENRE.test(r.primaryGenreName ?? '')) ?? (artist.instrumental ? candidates[0] : undefined)
  if (!best) return { results: [], cached: found.cached, networkCalls: found.cached ? 0 : 1 }
  if (!found.cached) await sleep(DELAY_MS)
  const songs = await cachedGet(`https://itunes.apple.com/lookup?id=${best.artistId}&entity=song&limit=200&country=US`, slug(artist, '.lookup'))
  return { results: (songs.data.results ?? []).filter((r) => r.wrapperType === 'track'), cached: found.cached && songs.cached }
}

function songCap(fame) {
  return fame >= 8 ? 90 : fame >= 6 ? 60 : fame >= 4 ? 40 : 28
}

function buildArtistSongs(artist, results) {
  const matching = results.filter((r) => r.kind === 'song' && r.previewUrl && creditMatches(r.artistName, artist.name))
  // Several artists can share a name; keep the one with the most Christian-genre songs.
  const byId = new Map()
  for (const r of matching) {
    const entry = byId.get(r.artistId) ?? { score: 0, count: 0 }
    entry.count += 1
    if (CHRISTIAN_GENRE.test(r.primaryGenreName ?? '')) entry.score += 1
    byId.set(r.artistId, entry)
  }
  const [bestId] = [...byId].sort((a, b) => b[1].score - a[1].score || b[1].count - a[1].count)[0] ?? []
  const songs = new Map()
  for (const r of matching) {
    if (r.artistId !== bestId && !CHRISTIAN_GENRE.test(r.primaryGenreName ?? '')) continue
    if (r.trackExplicitness === 'explicit') continue
    if (!artist.instrumental) {
      if (JUNK_VERSION.test(r.trackName) || NOT_A_SONG.test(r.trackName)) continue
      if ((r.trackTimeMillis ?? 0) < 75_000) continue
    }
    if (!artist.genres.includes('latin') && FOREIGN_VERSION.test(r.trackName)) continue
    const title = cleanTitle(r.trackName)
    const key = normTitle(title)
    if (!key) continue
    const year = r.releaseDate ? Number(r.releaseDate.slice(0, 4)) : undefined
    const existing = songs.get(key)
    if (existing) {
      if (year && (!existing.year || year < existing.year)) existing.year = year
      continue
    }
    const christmas = CHRISTMAS.test(title) || CHRISTMAS.test(r.collectionName ?? '')
    const hymn = HYMNS.includes(key)
    songs.set(key, { trackId: r.trackId, title, year, christmas, hymn })
  }
  return [...songs.values()].slice(0, songCap(artist.fame))
}

async function main() {
  await mkdir(cacheDir, { recursive: true })
  await mkdir(dirname(outFile), { recursive: true })
  const catalogArtists = []
  const catalogSongs = []
  const seenTracks = new Set()
  let lastWasNetwork = false

  for (const [index, artist] of artists.entries()) {
    if (lastWasNetwork) await sleep(DELAY_MS)
    const { data, cached } = await fetchArtist(artist)
    lastWasNetwork = !cached
    let songs = buildArtistSongs(artist, data.results ?? [])
    if (songs.length < 12) {
      if (lastWasNetwork) await sleep(DELAY_MS)
      const byId = await fetchArtistById(artist)
      lastWasNetwork = !byId.cached
      const merged = buildArtistSongs(artist, [...byId.results, ...(data.results ?? [])])
      if (merged.length > songs.length) songs = merged
    }
    const artistIndex = catalogArtists.length
    catalogArtists.push({ name: artist.name, genres: artist.genres, mine: artist.mine || undefined })
    songs.forEach((song, rank) => {
      if (seenTracks.has(song.trackId)) return
      seenTracks.add(song.trackId)
      // Famous artist + early rank = easy. Falls off smoothly down the artist's list.
      const popularity = Math.max(1, Math.round((artist.fame * 10) / (1 + rank / 5)))
      const genres = song.christmas ? ['christmas'] : song.hymn ? [...new Set([...artist.genres, 'hymns'])] : artist.genres
      const genreField = genres.join(',') === artist.genres.join(',') ? 0 : genres
      catalogSongs.push([song.trackId, song.title, artistIndex, song.year ?? 0, popularity, genreField])
    })
    console.log(`${String(index + 1).padStart(3)}/${artists.length} ${artist.name}: ${songs.length} songs${cached ? ' (cached)' : ''}`)
  }

  const catalog = {
    builtAt: new Date().toISOString(),
    genres: GENRES,
    artists: catalogArtists,
    /** [itunesTrackId, title, artistIndex, year, popularity 1–100, genres (0 = same as artist)] */
    songs: catalogSongs,
  }
  await writeFile(outFile, JSON.stringify(catalog))
  console.log(`\nWrote ${catalogSongs.length} songs by ${catalogArtists.length} artists to public/catalog.json`)
  const empty = catalogArtists.filter((a, i) => !catalogSongs.some((s) => s[2] === i)).map((a) => a.name)
  if (empty.length) console.log(`No songs found for: ${empty.join(', ')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
