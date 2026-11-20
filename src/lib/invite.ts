import { CARD_STYLES } from './shareRun'

/**
 * An invite to play, packed into a short link (/s?i=…). The link shows an
 * invite card in messages (like a Spotify embed): famous album covers, the
 * sharer's name and best score, in the colour they picked.
 */
type Packed = { n?: string; c?: number; b?: number; x?: 1 }
export type Invite = { name?: string; color: number; best: number; christmas: boolean }

/** A few friendly challenges; the sharer can flip between them. */
export const INVITES = [
  'Hey, come play Praise Play with me! How fast can you name the song? 🎶',
  'You say you’re good at music? Let’s find out. 🎵 Name the Christian song from 0.1 seconds:',
  'Think you know your worship music? Prove it. 0.1 seconds is all you get. 😏',
  'I bet you can’t beat my score. Come play Praise Play! 🏆',
  'Quick, name that song! Come play Praise Play with me 🎧',
]

const b64 = (text: string) => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function inviteLink(invite: Invite): string {
  const packed: Packed = { n: invite.name || undefined, c: invite.color || undefined, b: invite.best || undefined, x: invite.christmas ? 1 : undefined }
  return `${location.origin}/s?i=${b64(JSON.stringify(packed))}`
}

export function readInvite(param: string | null): Invite | null {
  if (param === null) return null
  try {
    const binary = param ? atob(param.replace(/-/g, '+').replace(/_/g, '/')) : '{}'
    const packed = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))) as Packed
    return {
      name: typeof packed.n === 'string' && packed.n.trim() ? packed.n.slice(0, 20) : undefined,
      color: Math.min(CARD_STYLES.length - 1, Math.max(0, Math.floor(Number(packed.c) || 0))),
      best: Math.max(0, Math.floor(Number(packed.b) || 0)),
      christmas: packed.x === 1,
    }
  } catch {
    return null
  }
}

export const inviteTitle = (invite: Invite) => (invite.name ? `${invite.name} challenged you to Praise Play` : 'Come play Praise Play')
export const inviteLine = (invite: Invite) =>
  invite.best
    ? `${invite.name ? `${invite.name}’s` : 'My'} best is ${invite.best.toLocaleString('en-US')} pts. Can you beat it?`
    : 'Thousands of Christian songs. How fast can you name them?'

type Pickable = { id: string; artist: string; art?: string; popularity: number }
/** The covers on the invite card: the most famous songs, one per artist. Same pick on the server and in the app. */
export function inviteCovers<T extends Pickable>(songs: Iterable<T>, count = 6): T[] {
  const sorted = [...songs].filter((s) => s.art).sort((a, b) => b.popularity - a.popularity || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const seen = new Set<string>()
  const out: T[] = []
  for (const song of sorted) {
    if (seen.has(song.artist)) continue
    seen.add(song.artist)
    out.push(song)
    if (out.length === count) break
  }
  return out
}
