#!/usr/bin/env node
/**
 * Checks every song in public/catalog.json against Apple and removes any that no
 * longer have a playable preview. Also downloads a random sample of previews and
 * covers to make sure they really serve audio and images.
 *
 *   npm run verify
 *   npm run verify -- seasonal/christmas.json
 *
 * Behind a proxy, run with NODE_USE_ENV_PROXY=1.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
// Defaults to the game's catalog; pass another file to check it instead (e.g. seasonal/christmas.json).
const file = process.argv[2] ? join(root, process.argv[2]) : join(root, 'public', 'catalog.json')
const BATCH = 150
const DELAY_MS = 3200
const SAMPLE = 40
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function lookup(ids) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(`https://itunes.apple.com/lookup?id=${ids.join(',')}&entity=song&country=US`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return (await response.json()).results ?? []
    } catch (error) {
      console.warn(`  lookup failed (${error.message}), retrying`)
      await sleep(15_000 * (attempt + 1))
    }
  }
  throw new Error('Apple lookup kept failing')
}

async function fetchOk(url, type) {
  try {
    const response = await fetch(url, { headers: { Range: 'bytes=0-2047' } })
    const contentType = response.headers.get('content-type') ?? ''
    return response.ok && contentType.startsWith(type)
  } catch {
    return false
  }
}

const catalog = JSON.parse(await readFile(file, 'utf8'))
const ids = catalog.songs.map((song) => song[0])
const previews = new Map()
for (let i = 0; i < ids.length; i += BATCH) {
  if (i) await sleep(DELAY_MS)
  for (const track of await lookup(ids.slice(i, i + BATCH))) if (track.previewUrl) previews.set(track.trackId, track.previewUrl)
  process.stdout.write(`\rChecked ${Math.min(i + BATCH, ids.length)}/${ids.length}`)
}
console.log()

const dead = catalog.songs.filter((song) => !previews.has(song[0]))
for (const song of dead) console.log(`  no preview: ${song[1]} — ${catalog.artists[song[2]].name}`)
catalog.songs = catalog.songs.filter((song) => previews.has(song[0]))

// Spot-check real downloads.
const sample = [...catalog.songs].sort(() => Math.random() - 0.5).slice(0, SAMPLE)
let audioOk = 0
let artOk = 0
let artChecked = 0
for (const song of sample) {
  if (await fetchOk(previews.get(song[0]), 'audio/')) audioOk += 1
  const art = catalog.arts[song[6]]
  if (art) {
    artChecked += 1
    const [server, path] = art.split('|')
    if (await fetchOk(`https://is${server}-ssl.mzstatic.com/image/thumb/${path}/300x300bb.jpg`, 'image/')) artOk += 1
  }
}

const withArt = catalog.songs.filter((song) => song[6] >= 0).length
await writeFile(file, JSON.stringify(catalog))
console.log(`\n${catalog.songs.length} songs have a preview (${dead.length} removed).`)
console.log(`${withArt} songs (${Math.round((withArt / catalog.songs.length) * 100)}%) have album art.`)
console.log(`Sample downloads: ${audioOk}/${sample.length} previews played back as audio, ${artOk}/${artChecked} covers served as images.`)
