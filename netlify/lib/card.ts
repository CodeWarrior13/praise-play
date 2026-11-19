/**
 * Draws a shared results card as a PNG, server-side, so the link shows the card
 * in iMessage, WhatsApp, email, Discord, Facebook, X… (link previews), and so
 * players can post it as an image to Instagram/TikTok/Facebook stories.
 *
 * Satori turns the layout into SVG; resvg (WebAssembly) turns that into PNG.
 * Fonts and the renderer are fetched from the site itself (public/og/).
 */
import satori from 'satori'
import { Resvg, initWasm } from '@resvg/resvg-wasm'
import jpeg from 'jpeg-js'
import { CARD_STYLES, type SharedRun } from '../../src/lib/shareRun'

export type CardSize = 'link' | 'story'
export const SIZES: Record<CardSize, { width: number; height: number }> = {
  link: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 },
}

type CatalogSong = { title: string; artist: string; art?: string }
type RawCatalog = { artists: { name: string }[]; arts?: string[]; songs: [number, string, number, number, number, unknown, number?, number?][] }

let assets: Promise<{ fonts: { name: string; data: ArrayBuffer; weight: 700 | 800; style: 'normal' }[] }> | null = null
const catalogs = new Map<string, Promise<Map<string, CatalogSong>>>()

function loadAssets(origin: string) {
  assets ??= (async () => {
    const get = (path: string) => fetch(`${origin}/og/${path}`).then((r) => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`)
      return r.arrayBuffer()
    })
    const [wasm, m700, m800, f700] = await Promise.all([get('resvg.wasm'), get('manrope-latin-700-normal.woff'), get('manrope-latin-800-normal.woff'), get('fraunces-latin-700-normal.woff')])
    await initWasm(wasm)
    return {
      fonts: [
        { name: 'Manrope', data: m700, weight: 700 as const, style: 'normal' as const },
        { name: 'Manrope', data: m800, weight: 800 as const, style: 'normal' as const },
        { name: 'Fraunces', data: f700, weight: 700 as const, style: 'normal' as const },
      ],
    }
  })().catch((error) => { assets = null; throw error })
  return assets
}

function loadSongs(origin: string, file: string) {
  let found = catalogs.get(file)
  if (!found) {
    found = fetch(`${origin}/${file}`).then((r) => r.json() as Promise<RawCatalog>).then((raw) => new Map(raw.songs.map((s) => {
      const art = (s[6] ?? -1) >= 0 ? raw.arts?.[s[6] as number] : undefined
      return [String(s[0]), { title: s[1], artist: raw.artists[s[2]].name, art }]
    })))
    found.catch(() => catalogs.delete(file))
    catalogs.set(file, found)
  }
  return found
}

const artUrl = (art: string | undefined, size: number) => {
  if (!art) return undefined
  const [server, path] = art.split('|')
  return `https://is${server}-ssl.mzstatic.com/image/thumb/${path}/${size}x${size}bb.jpg`
}

/** Album covers as data URIs (fetched in parallel; a missing one just shows a note). */
async function covers(urls: (string | undefined)[]): Promise<(string | undefined)[]> {
  return Promise.all(urls.map(async (url) => {
    if (!url) return undefined
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4000) })
      if (!response.ok) return undefined
      const bytes = Buffer.from(await response.arrayBuffer())
      return `data:${response.headers.get('content-type') ?? 'image/jpeg'};base64,${bytes.toString('base64')}`
    } catch {
      return undefined
    }
  }))
}

// A tiny hyperscript so this file needs no JSX setup.
type Node = { type: string; props: Record<string, unknown> }
const h = (type: string, style: Record<string, unknown>, ...children: (Node | string | null | false | undefined)[]): Node => ({
  type,
  props: { style: { display: 'flex', ...style }, children: children.filter((c) => c !== null && c !== false && c !== undefined) },
})
const img = (src: string, size: number, radius: number): Node => ({ type: 'img', props: { src, width: size, height: size, style: { width: size, height: size, borderRadius: radius, objectFit: 'cover' } } })

const fmt = (n: number) => n.toLocaleString('en-US')
const BRAND_BG = 'linear-gradient(150deg, #6a2fd6 0%, #b8327f 55%, #2a0f5c 100%)'

function background(shared: SharedRun) {
  const style = CARD_STYLES[shared.color] ?? CARD_STYLES[0]
  // The "theme" style uses the sharer's CSS variables, which a server can't see: use the brand colours.
  return { bg: style.id === 'theme' ? BRAND_BG : style.bg, dark: style.ink === 'dark', christmas: style.id === 'christmas' || shared.christmas }
}

function note(size: number, color: string): Node {
  return {
    type: 'svg',
    props: {
      width: size, height: size, viewBox: '0 0 24 24',
      children: [{ type: 'path', props: { fill: color, d: 'M9 18.5a3 3 0 1 1-2-2.83V5.5l12-2.5v12a3 3 0 1 1-2-2.83V7.6l-8 1.7v9.2Z' } }],
    },
  }
}

/** The card as a JPEG. */
export async function renderCard(origin: string, shared: SharedRun, size: CardSize): Promise<Uint8Array> {
  const [{ fonts }, songs, xmasSongs] = await Promise.all([
    loadAssets(origin),
    loadSongs(origin, 'catalog.json'),
    shared.christmas ? loadSongs(origin, 'christmas.json') : Promise.resolve(new Map<string, CatalogSong>()),
  ])
  const { width, height } = SIZES[size]
  const story = size === 'story'
  const rows = shared.results.slice(0, story ? 10 : 5).map((r) => ({ result: r, song: songs.get(r.songId) ?? xmasSongs.get(r.songId) }))
  const coverSize = story ? 112 : 70
  const images = await covers(rows.map((row) => artUrl(row.song?.art, story ? 200 : 140)))
  const { bg, dark, christmas } = background(shared)
  const ink = dark ? '#1d1420' : '#ffffff'
  const soft = dark ? 'rgba(29,20,32,.68)' : 'rgba(255,255,255,.78)'
  const faint = dark ? 'rgba(29,20,32,.5)' : 'rgba(255,255,255,.55)'
  const rowBg = dark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.24)'
  const named = shared.results.filter((r) => r.outcome === 'named').length
  const host = new URL(origin).host

  const badge = h('div', { alignItems: 'center', gap: 10, padding: story ? '12px 24px' : '9px 18px', borderRadius: 999, border: `2px solid ${dark ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.3)'}`, color: soft, fontSize: story ? 30 : 20, fontWeight: 800, letterSpacing: 3 },
    note(story ? 30 : 22, soft), christmas ? 'PRAISE PLAY · CHRISTMAS' : 'PRAISE PLAY')

  const list = h('div', { flexDirection: 'column', gap: story ? 18 : 10, width: story ? width - 120 : 600 },
    ...rows.map(({ result, song }, i) => h('div', { alignItems: 'center', gap: story ? 26 : 18, padding: story ? 18 : 10, borderRadius: story ? 26 : 18, background: rowBg },
      images[i] ? img(images[i] as string, coverSize, story ? 16 : 12) : h('div', { width: coverSize, height: coverSize, borderRadius: 12, background: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center' }, note(coverSize / 2.4, faint)),
      h('div', { flexDirection: 'column', flexGrow: 1, width: story ? 620 : 360 },
        h('div', { color: ink, fontSize: story ? 38 : 25, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, song?.title ?? 'Unknown song'),
        h('div', { color: soft, fontSize: story ? 30 : 20, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, song?.artist ?? ''),
        story ? h('div', { color: faint, fontSize: 26, fontWeight: 700, marginTop: 4 }, result.outcome === 'named' ? `Heard ${result.seconds < 1 ? result.seconds : Math.round(result.seconds)}s${result.elapsed ? ` · named in ${result.elapsed}s` : ''}` : 'Skipped') : null,
      ),
      h('div', { color: result.points ? ink : faint, fontSize: story ? 44 : 30, fontWeight: 800, minWidth: story ? 150 : 110, justifyContent: 'flex-end' }, result.points ? fmt(result.points) : '—'),
    )),
  )

  const who = shared.name ? `${shared.name} scored` : 'A friend scored'
  const total = h('div', { alignItems: 'flex-end', gap: 12 },
    h('div', { fontFamily: 'Fraunces', fontSize: story ? 190 : 132, lineHeight: 1, color: ink, letterSpacing: -4 }, fmt(shared.total)),
    h('div', { fontSize: story ? 44 : 32, fontWeight: 800, color: soft, marginBottom: story ? 22 : 14 }, 'pts'),
  )
  const verdict = `Named ${named} of ${shared.results.length}. Can you beat it?`
  const cta = h('div', { alignItems: 'center', gap: 12, padding: story ? '22px 40px' : '14px 26px', borderRadius: 999, background: dark ? '#1d1420' : '#ffffff', color: dark ? '#ffffff' : '#2a0f5c', fontSize: story ? 34 : 22, fontWeight: 800 },
    { type: 'svg', props: { width: story ? 30 : 20, height: story ? 30 : 20, viewBox: '0 0 24 24', children: [{ type: 'path', props: { fill: dark ? '#ffffff' : '#2a0f5c', d: 'M7 4.5v15l12.5-7.5L7 4.5Z' } }] } } as Node,
    `Play at ${host}`)

  const snow = christmas
    ? Array.from({ length: 30 }, (_, i) => h('div', { position: 'absolute', left: `${(i * 37) % 100}%`, top: `${(i * 61) % 100}%`, width: 5 + (i % 3) * 3, height: 5 + (i % 3) * 3, borderRadius: 999, background: 'rgba(255,255,255,.16)' }))
    : []

  const layout = story
    ? h('div', { width, height, flexDirection: 'column', alignItems: 'center', padding: '110px 60px 90px', background: bg, fontFamily: 'Manrope', position: 'relative' },
      ...snow,
      badge,
      h('div', { color: ink, fontSize: 56, fontWeight: 800, marginTop: 50 }, who),
      total,
      h('div', { color: soft, fontSize: 38, fontWeight: 700, marginBottom: 50 }, verdict),
      list,
      h('div', { flexGrow: 1 }),
      cta,
    )
    : h('div', { width, height, alignItems: 'center', justifyContent: 'space-between', padding: '0 56px', background: bg, fontFamily: 'Manrope', position: 'relative' },
      ...snow,
      h('div', { flexDirection: 'column', alignItems: 'flex-start', width: 470, gap: 6 },
        badge,
        h('div', { color: ink, fontSize: 40, fontWeight: 800, marginTop: 26 }, who),
        total,
        h('div', { color: soft, fontSize: 26, fontWeight: 700, marginBottom: 26 }, verdict),
        cta,
      ),
      list,
    )

  const svg = await satori(layout as never, { width, height, fonts })
  // JPEG keeps it small: WhatsApp and others skip preview images that are too big.
  const image = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render()
  return jpeg.encode({ data: Buffer.from(image.pixels), width: image.width, height: image.height }, 86).data
}
