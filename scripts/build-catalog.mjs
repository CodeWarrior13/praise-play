#!/usr/bin/env node
/**
 * Builds public/catalog.json from the artist roster (scripts/artists.mjs) and the
 * player's playlist songs (scripts/playlist-songs.json).
 *
 * 1. For each roster artist, ask the iTunes Search API for up to 200 of their songs.
 *    Apple returns them roughly in popularity order, which becomes each song's rank.
 *    Live/remix/instrumental duplicates are merged into one entry per title.
 * 2. Every playlist song is matched against that list, or looked up on its own
 *    when missing, and flagged so the game can offer "your playlist songs".
 * 3. Album covers are stored once per album and referenced by index.
 *
 *   npm run catalog            # uses cached responses when present
 *   npm run catalog -- --fresh # re-downloads everything
 *   npm run catalog -- --with-christmas  # puts the parked Christmas songs back in the game
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
/** Christmas songs are parked here, out of the game, until the season comes round. */
const christmasFile = join(root, 'seasonal', 'christmas.json')
const playlistFile = join(root, 'scripts', 'playlist-songs.json')
const fresh = process.argv.includes('--fresh')
/** Christmas songs stay out of the game unless this flag is passed (see seasonal/README.md). */
const withChristmas = process.argv.includes('--with-christmas')
const DELAY_MS = 3200 // Apple allows roughly 20 requests a minute.
const PLAYLIST_MIN_POPULARITY = 30

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const CHRISTIAN_GENRE = /christian|gospel|praise|worship|inspirational|ccm|christmas|holiday/i
const JUNK_VERSION = /\b(instrumental|karaoke|backing track|accompaniment|performance track|split track|remix|re-?mixed|sped up|slowed|8d audio|nightcore|lo-?fi|commentary|interview|medley|minus one|reprise|spontaneous|demo|voice memo|vocal track|piano version|cover)\b/i
const FOREIGN_VERSION = /\b(spanish|español|espanol|portugu[eê]s|en español|french|korean|german|italian)\b/i
const NOT_A_SONG = /^(intro|interlude|outro|prelude|skit|welcome|benediction)\b|[([](.*\b)?(interlude|skit|intro|outro)\b|^[^a-z0-9]*[([]/i
/**
 * English only. A Spanish/Portuguese song is spotted by its letters (ñ, ¿, ã…),
 * its album ("en español", "ao vivo"), or by Spanish/Portuguese words in the title.
 * English songs with a foreign-language title ("El Shaddai", "Hosanna", "Imela")
 * still count as English.
 */
const FOREIGN_CHARS = /[ñ¿¡ãõçáéíóúâêô]/i
const FOREIGN_ALBUM = /\b(en español|en espanol|spanish|español|portugu[eê]s|ao vivo|en vivo|en directo|versión|edición|adoración|alabanza)\b/i
const FOREIGN_STRONG = new Set(['dios', 'senor', 'senhor', 'deus', 'eres', 'quiero', 'gracias', 'aleluya', 'corazon', 'universo', 'amor', 'vida', 'fuego', 'cielo', 'santo', 'santa', 'padre', 'nombre', 'gracia', 'poder', 'rey', 'reyes', 'espiritu', 'presencia', 'hijo', 'camino', 'mundo', 'nuevo', 'nueva', 'siempre', 'nunca', 'todo', 'nada', 'soy', 'estoy', 'tengo', 'puedo', 'jesucristo', 'cristo', 'voce', 'sou', 'meu', 'minha', 'nuestro', 'nuestra', 'contigo', 'ti', 'tus', 'tuyo', 'hay', 'cuando', 'donde', 'porque', 'pero', 'mas', 'muy', 'esta', 'este', 'aqui', 'alli', 'gloria a', 'oh dios', 'mi dios', 'mi rey', 'hermoso', 'grande', 'fiel', 'digno', 'bendito', 'bendicion', 'victoria', 'libre', 'tiempo', 'eternidad', 'sangre', 'cruz', 'luz', 'paz', 'gozo', 'fe', 'himno', 'roca', 'tiene', 'miel', 'miles', 'aleluyas', 'manera'])
const FOREIGN_WEAK = new Set(['de', 'la', 'el', 'los', 'las', 'mi', 'tu', 'que', 'en', 'con', 'por', 'para', 'es', 'y', 'un', 'una', 'del', 'al', 'se', 'te', 'yo', 'su', 'lo', 'le', 'nos', 'como', 'o', 'e', 'do', 'da', 'dos', 'das', 'em', 'no', 'na'])
function isForeign(track) {
  const title = track.trackName ?? ''
  if (FOREIGN_CHARS.test(title) || FOREIGN_ALBUM.test(track.collectionName ?? '') || FOREIGN_ALBUM.test(title)) return true
  // Judge the song's own title: "(feat. De La Cruz)" says nothing about the language.
  const words = cleanTitle(title).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
  const strong = new Set(words.filter((w) => FOREIGN_STRONG.has(w))).size
  const weak = new Set(words.filter((w) => FOREIGN_WEAK.has(w))).size
  if (strong >= 1 && (strong + weak >= 2 || words.length <= 3)) return true
  return strong >= 2 || (weak >= 2 && weak / words.length >= 0.4)
}

/** Artists removed at the player's request: any song crediting them is left out. */
const BLOCKED_ARTISTS = /\b(henrik|cbertis)\b/i
const blocked = (track) => BLOCKED_ARTISTS.test(track.artistName ?? '') || BLOCKED_ARTISTS.test(track.trackName ?? '')
const VERSION_WORDS = /\b(en vivo|ao vivo|en directo|versi[oó]n|acústico|acustico|reloaded|revisited|redux|reworked|rework|re-?recorded|re-?imagined|alternate|anthem|choir|orchestral|10th|20th|25th|live|feat\.?|ft\.?|featuring|with|version|edit|remaster(ed)?|radio|single|studio|acoustic|deluxe|bonus|mono|stereo|from|session|sessions|mix|recorded|anniversary|edition|reimagined|extended|unplugged|stripped|original|bonus track)\b/i

/**
 * The Christmas list: famous songs only, each ONCE, in its best-known version.
 * Popularity (1–100) sets how early a song can come up in a run.
 * Covers by other artists are deliberately left out.
 */
const CHRISTMAS_SONGS = [
  // The biggest Christmas songs of all time
  { title: 'All I Want for Christmas Is You', artist: 'Mariah Carey', popularity: 100 },
  { title: 'White Christmas', artist: 'Bing Crosby', popularity: 96 },
  { title: 'Jingle Bell Rock', artist: 'Bobby Helms', popularity: 95 },
  { title: "Rockin' Around the Christmas Tree", artist: 'Brenda Lee', popularity: 95 },
  { title: 'Last Christmas', artist: 'Wham!', popularity: 94 },
  { title: "It's the Most Wonderful Time of the Year", artist: 'Andy Williams', popularity: 93 },
  { title: 'A Holly Jolly Christmas', artist: 'Burl Ives', popularity: 92 },
  { title: 'Feliz Navidad', artist: 'José Feliciano', popularity: 92 },
  { title: "Let It Snow! Let It Snow! Let It Snow!", artist: 'Dean Martin', popularity: 91 },
  { title: 'Sleigh Ride', artist: 'The Ronettes', popularity: 90 },
  { title: 'The Christmas Song', artist: 'Nat "King" Cole', popularity: 90 },
  { title: "It's Beginning to Look a Lot Like Christmas", artist: 'Michael Bublé', popularity: 90 },
  { title: 'Have Yourself a Merry Little Christmas', artist: 'Frank Sinatra', popularity: 86 },
  { title: 'Rudolph the Red-Nosed Reindeer', artist: 'Gene Autry', popularity: 88 },
  { title: 'Blue Christmas', artist: 'Elvis Presley', popularity: 85 },
  { title: "Baby, It's Cold Outside", artist: 'Dean Martin', popularity: 84 },
  { title: 'Santa Tell Me', artist: 'Ariana Grande', popularity: 86 },
  { title: 'Underneath the Tree', artist: 'Kelly Clarkson', popularity: 86 },
  { title: 'Mistletoe', artist: 'Justin Bieber', popularity: 85 },
  { title: 'Wonderful Christmastime', artist: 'Paul McCartney', popularity: 84 },
  { title: 'Happy Xmas (War Is Over)', artist: 'John Lennon', popularity: 82 },
  { title: 'Christmas (Baby Please Come Home)', artist: 'Darlene Love', popularity: 82 },
  { title: 'Run Rudolph Run', artist: 'Chuck Berry', popularity: 82 },
  { title: 'Santa Claus Is Comin\' to Town', artist: 'The Jackson 5', popularity: 80 },
  { title: 'Little Saint Nick', artist: 'The Beach Boys', popularity: 80 },
  { title: 'Santa Baby', artist: 'Eartha Kitt', popularity: 80 },
  { title: "Do They Know It's Christmas?", artist: 'Band Aid', popularity: 78 },
  { title: "You're a Mean One, Mr. Grinch", artist: 'Thurl Ravenscroft', popularity: 80 },
  { title: 'Jingle Bells', artist: 'Frank Sinatra', popularity: 82 },
  { title: 'Frosty the Snowman', artist: 'Gene Autry', popularity: 78 },
  { title: 'Here Comes Santa Claus', artist: 'Gene Autry', popularity: 76 },
  { title: 'Silver Bells', artist: 'Bing Crosby', popularity: 74 },
  { title: "I'll Be Home for Christmas", artist: 'Bing Crosby', popularity: 74 },
  { title: 'Winter Wonderland', artist: 'Darlene Love', popularity: 70 },
  { title: 'I Want a Hippopotamus for Christmas', artist: 'Gayla Peevey', popularity: 78 },
  { title: 'This Christmas', artist: 'Donny Hathaway', popularity: 74 },
  { title: 'Someday at Christmas', artist: 'Stevie Wonder', popularity: 66 },
  { title: 'Step Into Christmas', artist: 'Elton John', popularity: 72 },
  { title: 'Driving Home for Christmas', artist: 'Chris Rea', popularity: 70 },
  { title: 'Merry Christmas Darling', artist: 'Carpenters', popularity: 66 },
  { title: 'Christmas Time Is Here', artist: 'Vince Guaraldi Trio', popularity: 70 },
  { title: 'Mele Kalikimaka', artist: 'Bing Crosby', popularity: 62 },
  { title: 'Snowman', artist: 'Sia', popularity: 74 },
  { title: 'Christmas Tree Farm', artist: 'Taylor Swift', popularity: 70 },
  { title: 'Grown-Up Christmas List', artist: 'Amy Grant', popularity: 62 },
  // Pentatonix
  { title: 'Mary, Did You Know?', artist: 'Pentatonix', popularity: 92 },
  { title: 'Little Drummer Boy', artist: 'Pentatonix', popularity: 88 },
  { title: 'Hallelujah', artist: 'Pentatonix', popularity: 84 },
  { title: 'Carol of the Bells', artist: 'Pentatonix', popularity: 80 },
  { title: 'Silent Night', artist: 'Pentatonix', popularity: 74 },
  { title: 'O Come, All Ye Faithful', artist: 'Pentatonix', popularity: 70 },
  { title: 'Hark! The Herald Angels Sing', artist: 'Pentatonix', popularity: 62 },
  // Christmas worship & gospel
  { title: 'O Holy Night', artist: 'Josh Groban', popularity: 80 },
  { title: 'Do You Hear What I Hear?', artist: 'Whitney Houston', popularity: 76 },
  { title: 'Joy to the World', artist: 'Whitney Houston', popularity: 70 },
  { title: "Breath of Heaven (Mary's Song)", artist: 'Amy Grant', popularity: 70 },
  { title: 'Noel', artist: 'Chris Tomlin', popularity: 72 },
  { title: 'Light of the World', artist: 'Lauren Daigle', popularity: 68 },
  { title: 'Christmas Offering', artist: 'Casting Crowns', popularity: 64 },
  { title: 'Go Tell It on the Mountain', artist: 'Mahalia Jackson', popularity: 58 },
]

const CHRISTMAS = /christmas|silent night|holy night|joy to the world|hark the herald|come all ye faithful|go tell it on the mountain|little drummer boy|mary,? did you know|away in a manger|what child is this|angels we have heard|god rest ye|first no[eë]l|o come,? o come,? emmanuel|carol of the bells|o little town of bethlehem|it came upon the midnight|we three kings|feliz navidad|white christmas|noel\b/i
const HYMNS = new Set([
  'amazing grace', 'how great thou art', 'it is well', 'it is well with my soul', 'great is thy faithfulness', 'holy holy holy',
  'be thou my vision', 'come thou fount', 'come thou fount of every blessing', 'nothing but the blood', 'the old rugged cross',
  'blessed assurance', 'crown him with many crowns', 'in christ alone', 'before the throne of god above', 'jesus paid it all',
  'ill fly away', 'what a friend we have in jesus', 'rock of ages', 'turn your eyes upon jesus', 'because he lives', 'doxology',
  'abide with me', 'when i survey the wondrous cross', 'all hail the power of jesus name', 'just as i am', 'jesus loves me',
  'softly and tenderly', 'down to the river to pray', 'christ the lord is risen today', 'his eye is on the sparrow',
  'victory in jesus', 'leaning on the everlasting arms', 'nearer my god to thee', 'be still my soul', 'how firm a foundation',
  'there is power in the blood', 'standing on the promises', 'i surrender all', 'to god be the glory',
  'and can it be', 'o for a thousand tongues', 'all creatures of our god and king', 'praise to the lord the almighty',
  'this is my fathers world', 'the solid rock', 'my hope is built', 'when the roll is called up yonder', 'shall we gather at the river',
  'i need thee every hour', 'are you washed in the blood', 'were you there', 'sweet hour of prayer', 'how sweet the name of jesus sounds',
  'man of sorrows', 'living he loved me', 'his mercy is more', 'o praise the name', 'the love of god',
])

/** Apple's genre names → our genre ids, for artists marked "auto" and one-off playlist songs. */
function genresFromApple(names, artistName = '') {
  const counts = {}
  for (const name of names) {
    const n = name.toLowerCase()
    const id = /gospel/.test(n) ? 'gospel' : /rap|hip-hop|hip hop/.test(n) ? 'hiphop' : /metal|hard rock/.test(n) ? 'metal' : /rock|punk/.test(n) ? 'rock'
      : /latin|latino|cristiana/.test(n) ? 'latin' : /country/.test(n) ? 'country' : /folk|singer|songwriter|americana/.test(n) ? 'folk'
      : /r&b|soul/.test(n) ? 'rnb' : /electronic|dance|edm|house/.test(n) ? 'electronic' : /alternative|indie/.test(n) ? 'indie'
      : /worship|praise/.test(n) ? 'worship' : 'ccm'
    counts[id] = (counts[id] ?? 0) + 1
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id]) => id)
  const genres = ranked.slice(0, 1)
  if (/worship/i.test(artistName) && !genres.includes('worship')) genres.unshift('worship')
  return genres.length ? genres : ['ccm']
}

function normName(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[&+]/g, ' and ').replace(/\s+/g, ' ').trim()
}

function normTitle(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
}

/** "Graves Into Gardens (feat. Brandon Lake) [Live]" → "Graves Into Gardens" */
function cleanTitle(title) {
  let clean = title
  for (let i = 0; i < 3; i++) clean = clean.replace(/\s*[([]([^()[\]]*)[)\]]/g, (match, inner) => (VERSION_WORDS.test(inner) ? '' : match))
  clean = clean.replace(/\s+[-–—]\s+(.*)$/, (match, tail) => (VERSION_WORDS.test(tail) ? '' : match))
  return clean.replace(/\s+/g, ' ').trim()
}

function creditMatches(artistName, rosterName) {
  const a = normName(artistName).replace(/^the /, '')
  const n = normName(rosterName).replace(/^the /, '')
  if (a === n) return true
  if (!a.startsWith(n)) return false
  return /^(\s*,|\s+and\s|\s+x\s|\s+feat|\s+ft\b|\s+with\s|\s*\()/.test(a.slice(n.length))
}

/** Is `name` credited anywhere on the track (main artist or "feat." in the title)? */
function creditedAnywhere(track, name) {
  const n = normName(name).replace(/^the /, '')
  return normName(track.artistName ?? '').includes(n) || normName(track.trackName ?? '').includes(n)
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = temp
    }
  }
  return row[b.length]
}

/** Spotify and Apple sometimes title a song slightly differently ("REST" vs "Rested"). */
function titlesClose(a, b) {
  if (a === b) return true
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)) && Math.abs(a.length - b.length) <= 3) return true
  const wordsA = a.split(' ').sort().join(' ')
  const wordsB = b.split(' ').sort().join(' ')
  return wordsA === wordsB
}

const slug = (name, suffix = '') => join(cacheDir, `${normTitle(name).replace(/ /g, '-').slice(0, 80) || 'item'}${suffix}.json`)
let lastRequest = 0

async function cachedGet(url, cacheFile) {
  if (!fresh && existsSync(cacheFile)) return { data: JSON.parse(await readFile(cacheFile, 'utf8')), cached: true }
  for (let attempt = 0; attempt < 5; attempt++) {
    const wait = lastRequest + DELAY_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastRequest = Date.now()
    try {
      const response = await fetch(url)
      if (response.status === 403 || response.status === 429 || response.status >= 500) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      await writeFile(cacheFile, JSON.stringify(data))
      return { data, cached: false }
    } catch (error) {
      const backoff = 15_000 * (attempt + 1)
      console.warn(`  ${url}: ${error.message}; retrying in ${backoff / 1000}s`)
      await sleep(backoff)
    }
  }
  throw new Error(`Could not fetch ${url}`)
}

function fetchArtist(artist) {
  const params = new URLSearchParams({ term: artist.name, entity: 'song', attribute: 'artistTerm', limit: '200', country: 'US' })
  return cachedGet(`https://itunes.apple.com/search?${params}`, slug(artist.name))
}

/** For shared names ("Passion", "Red"), list songs by the artist's own Apple ID. */
async function fetchArtistById(artist, knownId) {
  let id = artist.appleId ?? knownId
  if (!id) {
    const params = new URLSearchParams({ term: artist.name, entity: 'musicArtist', limit: '25', country: 'US' })
    const found = await cachedGet(`https://itunes.apple.com/search?${params}`, slug(artist.name, '.artist'))
    const candidates = (found.data.results ?? []).filter((r) => normName(r.artistName) === normName(artist.name))
    id = (candidates.find((r) => CHRISTIAN_GENRE.test(r.primaryGenreName ?? '')) ?? (artist.instrumental || artist.genres.includes('auto') ? candidates[0] : undefined))?.artistId
  }
  if (!id) return []
  const songs = await cachedGet(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=200&country=US`, slug(artist.name, `.lookup-${id}`))
  return (songs.data.results ?? []).filter((r) => r.wrapperType === 'track')
}

function songCap(fame) {
  return fame >= 8 ? 90 : fame >= 6 ? 60 : fame >= 4 ? 40 : 28
}

function keepTrack(track, artist) {
  if (track.kind !== 'song' || !track.previewUrl || blocked(track) || isForeign(track)) return false
  if (track.trackExplicitness === 'explicit') return false
  if (!artist.instrumental) {
    if (JUNK_VERSION.test(track.trackName) || NOT_A_SONG.test(track.trackName)) return false
    if ((track.trackTimeMillis ?? 0) < 75_000) return false
  }
  if (!artist.genres.includes('latin') && FOREIGN_VERSION.test(track.trackName)) return false
  return true
}

function buildArtistSongs(artist, results, preferredId) {
  const matching = results.filter((r) => r.kind === 'song' && r.previewUrl && creditMatches(r.artistName, artist.name))
  const byId = new Map()
  for (const r of matching) {
    const entry = byId.get(r.artistId) ?? { score: 0, count: 0 }
    entry.count += 1
    if (CHRISTIAN_GENRE.test(r.primaryGenreName ?? '')) entry.score += 1
    byId.set(r.artistId, entry)
  }
  const pinned = artist.appleId ?? preferredId
  const [bestId] = pinned ? [pinned] : [...byId].sort((a, b) => b[1].score - a[1].score || b[1].count - a[1].count)[0] ?? []
  const songs = new Map()
  for (const r of matching) {
    if (pinned ? r.artistId !== pinned : r.artistId !== bestId && !CHRISTIAN_GENRE.test(r.primaryGenreName ?? '')) continue
    if (!keepTrack(r, artist)) continue
    const title = cleanTitle(r.trackName)
    const key = normTitle(title)
    if (!key) continue
    const year = r.releaseDate ? Number(r.releaseDate.slice(0, 4)) : undefined
    const existing = songs.get(key)
    if (existing) {
      if (year && (!existing.year || year < existing.year)) existing.year = year
      // Prefer the plain original ("Oceans") over a labelled version ("Oceans [Reloaded]"),
      // keeping the popularity rank the song first appeared at.
      if (existing.track.trackName !== existing.title && r.trackName === title) existing.track = r
      continue
    }
    songs.set(key, { track: r, title, key, year })
  }
  return [...songs.values()].slice(0, songCap(artist.fame))
}

async function main() {
  await mkdir(cacheDir, { recursive: true })
  await mkdir(dirname(outFile), { recursive: true })
  const playlist = JSON.parse(await readFile(playlistFile, 'utf8')).songs
  const playlistArtists = new Set(playlist.flatMap((song) => song.artists.map(normName)))

  const catalogArtists = []
  const artistIndexByName = new Map()
  const entries = [] // { track, title, key, year, artistIndex, popularity, genres, playlist }
  const seenTracks = new Set()
  const appleGenresByArtist = new Map()

  function addArtist(name, genres, mine) {
    const key = normName(name)
    if (artistIndexByName.has(key)) return artistIndexByName.get(key)
    const index = catalogArtists.length
    catalogArtists.push({ name, genres, mine: mine || undefined })
    artistIndexByName.set(key, index)
    return index
  }

  // Pass 1: every roster artist's catalog.
  for (const [i, artist] of artists.entries()) {
    const { data } = await fetchArtist(artist)
    let results = data.results ?? []
    let songs = buildArtistSongs(artist, results)
    if (songs.length < 12 || artist.appleId) {
      const byId = await fetchArtistById(artist)
      const merged = buildArtistSongs(artist, [...byId, ...results])
      if (merged.length > songs.length) { songs = merged; results = [...byId, ...results] }
    }
    const genres = artist.genres.includes('auto') ? genresFromApple(songs.map((s) => s.track.primaryGenreName ?? ''), artist.name) : artist.genres
    const mine = artist.mine || playlistArtists.has(normName(artist.name))
    const artistIndex = addArtist(artist.name, genres, mine)
    appleGenresByArtist.set(artistIndex, genres)
    songs.forEach((song, rank) => {
      if (seenTracks.has(song.track.trackId)) return
      seenTracks.add(song.track.trackId)
      const popularity = Math.max(1, Math.round((artist.fame * 10) / (1 + rank / 5)))
      entries.push({ ...song, artistIndex, popularity, genres, playlist: false })
    })
    console.log(`${String(i + 1).padStart(3)}/${artists.length} ${artist.name}: ${songs.length} songs${artist.genres.includes('auto') ? ` [${genres}]` : ''}`)
  }

  // Pass 2: make sure every playlist song is in, and flag it.
  const byKey = new Map()
  for (const entry of entries) {
    const list = byKey.get(entry.key) ?? []
    list.push(entry)
    byKey.set(entry.key, list)
  }
  let matched = 0
  let added = 0
  const missing = []
  for (const song of playlist) {
    const key = normTitle(cleanTitle(song.title))
    const local = (byKey.get(key) ?? []).find((entry) => song.artists.some((name) => creditedAnywhere(entry.track, name) || normName(catalogArtists[entry.artistIndex].name) === normName(name)))
    if (local) {
      local.playlist = true
      local.popularity = Math.max(local.popularity, PLAYLIST_MIN_POPULARITY)
      matched += 1
      continue
    }
    const params = new URLSearchParams({ term: `${cleanTitle(song.title)} ${song.artists[0]}`, entity: 'song', limit: '25', country: 'US' })
    const { data } = await cachedGet(`https://itunes.apple.com/search?${params}`, slug(`${song.title} ${song.artists[0]}`, '.song'))
    const wantsVersion = JUNK_VERSION.test(song.title)
    const usable = (data.results ?? []).filter((r) => !blocked(r) && !isForeign(r) && r.kind === 'song' && r.previewUrl && r.trackExplicitness !== 'explicit' && (wantsVersion || !JUNK_VERSION.test(r.trackName)))
    const credited = (r) => song.artists.some((name) => creditedAnywhere(r, name))
    const exact = usable.filter((r) => normTitle(cleanTitle(r.trackName)) === key)
    const track = exact.find(credited) ?? exact.find((r) => creditedAnywhere(r, song.artists[0].split(' ')[0]))
      ?? usable.filter(credited).find((r) => titlesClose(normTitle(cleanTitle(r.trackName)), key))
    if (!track) { missing.push(`${song.title} — ${song.artists.join(', ')}`); continue }
    if (seenTracks.has(track.trackId)) {
      const entry = entries.find((e) => e.track.trackId === track.trackId)
      if (entry) { entry.playlist = true; entry.popularity = Math.max(entry.popularity, PLAYLIST_MIN_POPULARITY) }
      matched += 1
      continue
    }
    seenTracks.add(track.trackId)
    const primary = song.artists[0]
    const existing = artistIndexByName.get(normName(primary))
    const genres = existing !== undefined ? catalogArtists[existing].genres : genresFromApple([track.primaryGenreName ?? ''], primary)
    const artistIndex = existing ?? addArtist(primary, genres, true)
    const title = cleanTitle(track.trackName)
    const christmas = CHRISTMAS.test(title) || CHRISTMAS.test(track.collectionName ?? '')
    entries.push({ track, title, key: normTitle(title), year: Number(track.releaseDate?.slice(0, 4)) || undefined, artistIndex, popularity: PLAYLIST_MIN_POPULARITY, genres: christmas ? ['christmas'] : genres, playlist: true })
    added += 1
  }

  // Famous Christmas songs, looked up one by one (they go to the parked Christmas file).
  let extrasFound = 0
  const extrasMissing = []
  for (const extra of CHRISTMAS_SONGS) {
    const key = normTitle(cleanTitle(extra.title))
    const params = new URLSearchParams({ term: `${cleanTitle(extra.title)} ${extra.artist}`, entity: 'song', limit: '25', country: 'US' })
    const { data } = await cachedGet(`https://itunes.apple.com/search?${params}`, slug(`${extra.title} ${extra.artist}`, '.xmas'))
    const usable = (data.results ?? []).filter((r) => r.kind === 'song' && r.previewUrl && r.trackExplicitness !== 'explicit' && !/karaoke|instrumental|backing track/i.test(r.trackName))
    // Subtitles ("The Christmas Song (Merry Christmas to You)") and spellings ("Comin'" / "Coming") still match.
    const bare = (title) => normTitle(cleanTitle(title).replace(/\s*[([].*?[)\]]/g, ''))
    const near = (a, b) => titlesClose(a, b) || editDistance(a, b) <= 2
    const track = usable.find((r) => creditedAnywhere(r, extra.artist) && (near(normTitle(cleanTitle(r.trackName)), key) || near(bare(r.trackName), bare(extra.title))))
    if (!track) { extrasMissing.push(`${extra.title} — ${extra.artist}`); continue }
    extrasFound += 1
    if (seenTracks.has(track.trackId)) {
      // Already pulled in from the artist's own catalog: move it onto the Christmas list.
      const entry = entries.find((e) => e.track.trackId === track.trackId)
      if (entry) Object.assign(entry, { christmas: true, popularity: extra.popularity, genres: ['christmas'] })
      continue
    }
    seenTracks.add(track.trackId)
    const artistIndex = artistIndexByName.get(normName(extra.artist)) ?? addArtist(extra.artist, ['christmas'], false)
    entries.push({ track, title: cleanTitle(track.trackName), key: normTitle(cleanTitle(track.trackName)), year: Number(track.releaseDate?.slice(0, 4)) || undefined, artistIndex, popularity: extra.popularity, genres: ['christmas'], playlist: false, christmas: true })
  }

  const isChristmas = (entry) => entry.christmas || CHRISTMAS.test(entry.title) || CHRISTMAS.test(entry.track.collectionName ?? '')
  // Christmas = the hand-picked list only (one best-known version per song).
  // Christmas tracks found in artists' own catalogs are dropped so covers never pile up.
  // One version per song: if two picks share a title, keep the most popular.
  const christmasByTitle = new Map()
  for (const entry of entries.filter((e) => e.christmas).sort((a, b) => b.popularity - a.popularity)) {
    const bare = normTitle(entry.title.replace(/\s*[([].*?[)\]]/g, ''))
    if (!christmasByTitle.has(bare)) christmasByTitle.set(bare, entry)
  }
  const christmasEntries = [...christmasByTitle.values()]
  const nonChristmas = entries.filter((entry) => !isChristmas(entry))
  const mainEntries = withChristmas ? [...nonChristmas, ...christmasEntries] : nonChristmas

  /** Builds one catalog file from a set of entries, keeping only the artists and covers it uses. */
  function makeCatalog(list, christmas) {
    const arts = []
    const artIndex = new Map()
    const artFor = (track) => {
      const match = (track.artworkUrl100 ?? '').match(/^https:\/\/is(\d)-ssl\.mzstatic\.com\/image\/thumb\/(.+)\/100x100bb\.(jpg|png|webp)$/)
      if (!match) return -1
      const key = `${match[1]}|${match[2]}`
      if (!artIndex.has(key)) { artIndex.set(key, arts.length); arts.push(key) }
      return artIndex.get(key)
    }
    const usedArtists = [...new Set(list.map((e) => e.artistIndex))]
    const remap = new Map(usedArtists.map((old, i) => [old, i]))
    const artists = usedArtists.map((i) => catalogArtists[i])
    const songs = list.map((entry) => {
      const hymn = HYMNS.has(entry.key)
      const base = catalogArtists[entry.artistIndex].genres
      const genres = christmas || isChristmas(entry) ? ['christmas'] : hymn ? [...new Set([...entry.genres, 'hymns'])] : entry.genres
      const genreField = genres.join(',') === base.join(',') ? 0 : genres
      return [entry.track.trackId, entry.title, remap.get(entry.artistIndex), entry.year ?? 0, entry.popularity, genreField, artFor(entry.track), entry.playlist ? 1 : 0]
    })
    return {
      builtAt: new Date().toISOString(),
      genres: christmas ? { christmas: GENRES.christmas } : withChristmas ? GENRES : Object.fromEntries(Object.entries(GENRES).filter(([id]) => id !== 'christmas')),
      artists,
      /** Album art paths: "<server digit>|<path>" → https://is<digit>-ssl.mzstatic.com/image/thumb/<path>/<size>x<size>bb.jpg */
      arts,
      /** [itunesTrackId, title, artistIndex, year, popularity 1–100, genres (0 = artist's), art index (-1 = none), 1 = from your playlists] */
      songs,
    }
  }

  const catalog = makeCatalog(mainEntries, false)
  const christmasCatalog = makeCatalog(christmasEntries, true)
  await writeFile(outFile, JSON.stringify(catalog))
  await mkdir(dirname(christmasFile), { recursive: true })
  await writeFile(christmasFile, JSON.stringify(christmasCatalog))
  console.log(`\nPlaylist songs: ${matched} already in catalog, ${added} added, ${missing.length} not found on Apple Music`)
  if (missing.length) console.log(`  Not found:\n  ${missing.join('\n  ')}`)
  console.log(`Wrote ${catalog.songs.length} songs by ${catalog.artists.length} artists (${catalog.arts.length} album covers) to public/catalog.json`)
  console.log(`Parked ${christmasCatalog.songs.length} Christmas songs by ${christmasCatalog.artists.length} artists in seasonal/christmas.json (${extrasFound} of ${CHRISTMAS_SONGS.length} picks found)`)
  if (extrasMissing.length) console.log(`  Christmas picks not found:\n  ${extrasMissing.join('\n  ')}`)
  const empty = catalogArtists.filter((a) => !catalog.artists.includes(a) && !christmasCatalog.artists.includes(a)).map((a) => a.name)
  if (empty.length) console.log(`No songs found for: ${empty.join(', ')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
