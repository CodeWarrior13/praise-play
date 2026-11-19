import type { RunRecord, SongResult } from './storage'

/**
 * A finished game packed into a short link (?r=…), so friends can open a results
 * card: every song's cover, time and score, with previews to play right there.
 */
type Packed = { n?: string; m: string; t: number; c?: number; x?: 1; s: [string, number, number, number, number, number, number][] }
const OUTCOMES: SongResult['outcome'][] = ['named', 'skipped', 'unavailable']
const MAX_SONGS = 15

export type SharedRun = { name?: string; mode: string; total: number; results: SongResult[]; color: number; christmas: boolean }

/** Card colour styles, like Spotify's embed colours. Index 0 follows the sharer's theme. */
export const CARD_STYLES: { id: string; name: string; bg: string; ink?: 'dark'; seasonal?: boolean }[] = [
  { id: 'theme', name: 'Theme', bg: 'linear-gradient(150deg, color-mix(in srgb, var(--accent-b) 70%, #000) 0%, color-mix(in srgb, var(--accent-a) 45%, #000) 100%)' },
  { id: 'crimson', name: 'Crimson', bg: 'linear-gradient(150deg, #b3143c 0%, #4a0618 100%)' },
  { id: 'sunset', name: 'Sunset', bg: 'linear-gradient(150deg, #ff7a3d 0%, #c2185b 60%, #4a0f3a 100%)' },
  { id: 'gold', name: 'Gold', bg: 'linear-gradient(150deg, #e0a91b 0%, #7a4d06 100%)' },
  { id: 'forest', name: 'Forest', bg: 'linear-gradient(150deg, #1f9d5c 0%, #07331f 100%)' },
  { id: 'ocean', name: 'Ocean', bg: 'linear-gradient(150deg, #1e88e5 0%, #0b2a5c 100%)' },
  { id: 'violet', name: 'Violet', bg: 'linear-gradient(150deg, #8e44ff 0%, #2b0b5c 100%)' },
  { id: 'blush', name: 'Blush', bg: 'linear-gradient(150deg, #ffd1dc 0%, #f59ab5 100%)', ink: 'dark' },
  { id: 'mint', name: 'Mint', bg: 'linear-gradient(150deg, #d4fbe8 0%, #8fe3bd 100%)', ink: 'dark' },
  { id: 'midnight', name: 'Midnight', bg: 'linear-gradient(150deg, #2a2f3a 0%, #0b0d12 100%)' },
  // Christmas season only (picker hides it the rest of the year; old links still show it).
  { id: 'christmas', name: 'Christmas', seasonal: true, bg: 'radial-gradient(circle at 20% 0%, rgba(246,196,83,.35), transparent 45%), linear-gradient(150deg, #c8102e 0%, #7a0a1c 55%, #0f4d2a 100%)' },
]
export const CHRISTMAS_CARD = CARD_STYLES.findIndex((s) => s.id === 'christmas')

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): string {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

export function shareLink(run: RunRecord, mode: string, name?: string, color = 0, christmas = false): string {
  const packed: Packed = {
    n: name || undefined,
    m: mode,
    t: run.total,
    c: color || undefined,
    x: christmas ? 1 : undefined,
    s: run.results.slice(0, MAX_SONGS).map((r) => [
      r.songId, Math.round(r.seconds * 10), r.points, Math.max(0, OUTCOMES.indexOf(r.outcome)),
      r.wrongGuesses, r.hints ?? 0, Math.round((r.elapsed ?? 0) * 10),
    ]),
  }
  // /s serves link-preview tags with the card image, then opens the game (netlify/functions/share-page.mts).
  return `${location.origin}/s?r=${toBase64Url(JSON.stringify(packed))}`
}

export function readSharedRun(param: string | null): SharedRun | null {
  if (!param) return null
  try {
    const packed = JSON.parse(fromBase64Url(param)) as Packed
    if (!Array.isArray(packed.s)) return null
    return {
      name: typeof packed.n === 'string' ? packed.n.slice(0, 20) : undefined,
      mode: String(packed.m ?? 'run'),
      total: Number(packed.t) || 0,
      color: Math.min(CARD_STYLES.length - 1, Math.max(0, Math.floor(Number(packed.c) || 0))),
      christmas: packed.x === 1,
      results: packed.s.slice(0, MAX_SONGS).map(([songId, tenths, points, outcome, wrong, hints, elapsed]) => ({
        songId: String(songId), title: '', artist: '', seconds: tenths / 10, points: Number(points) || 0,
        outcome: OUTCOMES[outcome] ?? 'skipped', wrongGuesses: Number(wrong) || 0, hints: Number(hints) || 0, elapsed: elapsed / 10,
      })),
    }
  } catch {
    return null
  }
}

/** The card as a picture: 'link' for previews, 'story' for Instagram/TikTok/Facebook stories. */
export function cardImageUrl(link: string, size: 'link' | 'story'): string {
  const r = new URL(link).searchParams.get('r') ?? ''
  return `${new URL(link).origin}/api/card?r=${encodeURIComponent(r)}&size=${size}`
}

/** The message that goes with the link. */
export function shareMessage(total: number, name?: string): string {
  const who = name ? `${name} scored` : 'I scored'
  return `${who} ${total.toLocaleString('en-US')} on Praise Play 🎵 Can you beat it?`
}
