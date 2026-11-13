/**
 * Private multiplayer rooms, peer-to-peer over WebRTC.
 *
 * The host's browser runs the room: it picks the songs, keeps the clock and the
 * scores, and relays everything to the players (a star of data connections).
 * PeerJS's free public broker only introduces the browsers to each other, and
 * its TURN relays carry the data when two networks can't connect directly.
 * No game server or account is needed, which suits a static Netlify site.
 */
import type { DataConnection, Peer as PeerType, PeerOptions } from 'peerjs'
import type { Song } from './catalog'
import { getPreview, prefetchPreviews } from './preview'
import { buildRun } from './run'
import { songPoints } from './scoring'

export const MAX_PLAYERS = 30
export const ROUND_MS = 45_000
const GRACE_MS = 1_500
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ID_PREFIX = 'praiseplay-room-'

export type Outcome = 'named' | 'skipped' | 'timeout'

export type PlayerView = { id: string; name: string; score: number; host: boolean; connected: boolean }

export type RoundResult = { id: string; name: string; outcome: Outcome; points: number; seconds: number; wrong: number; elapsed: number }

export type Settings = { rounds: number }

/** Everything the host tells players. The host's own screen renders the same messages. */
export type ServerMessage =
  | { t: 'welcome'; you: string; code: string }
  | { t: 'lobby'; players: PlayerView[]; settings: Settings; phase: 'lobby' | 'playing' | 'ended' }
  | { t: 'round'; index: number; total: number; songId: string; nextSongId?: string; durationMs: number }
  | { t: 'status'; answered: string[] }
  | { t: 'reveal'; index: number; total: number; songId: string; results: RoundResult[]; standings: PlayerView[]; last: boolean }
  | { t: 'end'; standings: PlayerView[] }
  | { t: 'error'; message: string; fatal?: boolean }

export type ClientMessage =
  | { t: 'hello'; name: string }
  | { t: 'answer'; index: number; outcome: Outcome; seconds: number; wrong: number; elapsed: number }

type Answer = { outcome: Outcome; seconds: number; wrong: number; elapsed: number; points: number }

export type Listener = (message: ServerMessage) => void

/** Optional self-hosted broker (VITE_PEER_HOST etc.); otherwise PeerJS's free cloud. */
function peerOptions(): PeerOptions {
  const env = import.meta.env
  if (!env.VITE_PEER_HOST) return { debug: 0 }
  return {
    host: env.VITE_PEER_HOST,
    port: Number(env.VITE_PEER_PORT ?? 443),
    path: env.VITE_PEER_PATH ?? '/',
    secure: env.VITE_PEER_SECURE !== 'false',
    debug: 0,
  }
}

async function createPeer(id?: string): Promise<PeerType> {
  const { Peer } = await import('peerjs')
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, peerOptions()) : new Peer(peerOptions())
    const timer = window.setTimeout(() => { peer.destroy(); reject(new Error('Could not reach the multiplayer service. Check your connection and try again.')) }, 15_000)
    peer.once('open', () => { window.clearTimeout(timer); resolve(peer) })
    peer.once('error', (error: Error & { type?: string }) => {
      window.clearTimeout(timer)
      peer.destroy()
      reject(error)
    })
  })
}

export function randomCode(): string {
  let code = ''
  for (let i = 0; i < 5; i++) code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]
  return code
}

export function cleanCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
}

export function cleanName(input: string): string {
  return input.replace(/\s+/g, ' ').trim().slice(0, 20) || 'Player'
}

/* ------------------------------------------------------------------ Host */

export class HostRoom {
  readonly code: string
  private peer: PeerType
  private conns = new Map<string, DataConnection>()
  private players = new Map<string, PlayerView>()
  private settings: Settings = { rounds: 5 }
  private phase: 'lobby' | 'playing' | 'ended' = 'lobby'
  private songs: Song[] = []
  private index = -1
  private answers = new Map<string, Answer>()
  private roundStarted = 0
  private roundTimer = 0
  private roundOpen = false
  private listener: Listener

  static async create(hostName: string, listener: Listener): Promise<HostRoom> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = randomCode()
      try {
        const peer = await createPeer(ID_PREFIX + code)
        return new HostRoom(peer, code, hostName, listener)
      } catch (error) {
        if ((error as { type?: string }).type !== 'unavailable-id') throw error
      }
    }
    throw new Error('Could not create a room. Please try again.')
  }

  private constructor(peer: PeerType, code: string, hostName: string, listener: Listener) {
    this.peer = peer
    this.code = code
    this.listener = listener
    this.players.set('host', { id: 'host', name: cleanName(hostName), score: 0, host: true, connected: true })
    peer.on('connection', (conn) => this.accept(conn))
    peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect() })
    queueMicrotask(() => {
      this.listener({ t: 'welcome', you: 'host', code })
      this.sendLobby()
    })
  }

  private accept(conn: DataConnection) {
    conn.on('open', () => {
      const connected = [...this.players.values()].filter((p) => p.connected).length
      if (connected >= MAX_PLAYERS) {
        conn.send({ t: 'error', message: `This room is full (${MAX_PLAYERS} players).`, fatal: true } satisfies ServerMessage)
        window.setTimeout(() => conn.close(), 500)
        return
      }
      this.conns.set(conn.peer, conn)
    })
    conn.on('data', (data) => this.receive(conn.peer, data as ClientMessage))
    const drop = () => {
      this.conns.delete(conn.peer)
      const player = this.players.get(conn.peer)
      if (!player) return
      if (this.phase === 'lobby') this.players.delete(conn.peer)
      else player.connected = false
      this.sendLobby()
      this.checkRoundDone()
    }
    conn.on('close', drop)
    conn.on('error', drop)
  }

  private uniqueName(name: string, id: string): string {
    const taken = new Set([...this.players.values()].filter((p) => p.id !== id).map((p) => p.name.toLowerCase()))
    if (!taken.has(name.toLowerCase())) return name
    for (let n = 2; ; n++) if (!taken.has(`${name} ${n}`.toLowerCase())) return `${name} ${n}`
  }

  private receive(id: string, message: ClientMessage) {
    if (message.t === 'hello') {
      const existing = this.players.get(id)
      const name = this.uniqueName(cleanName(message.name), id)
      this.players.set(id, { id, name, score: existing?.score ?? 0, host: false, connected: true })
      this.sendTo(id, { t: 'welcome', you: id, code: this.code })
      this.sendLobby()
      // Joining mid-game: drop straight into the current song.
      if (this.phase === 'playing' && this.roundOpen) {
        const song = this.songs[this.index]
        const left = Math.max(5_000, ROUND_MS - (performance.now() - this.roundStarted))
        this.sendTo(id, { t: 'round', index: this.index, total: this.songs.length, songId: song.id, nextSongId: this.songs[this.index + 1]?.id, durationMs: left })
      }
    } else if (message.t === 'answer') {
      this.submit(id, message)
    }
  }

  private sendTo(id: string, message: ServerMessage) {
    if (id === 'host') this.listener(message)
    else this.conns.get(id)?.send(message)
  }

  private broadcast(message: ServerMessage) {
    for (const conn of this.conns.values()) if (conn.open) conn.send(message)
    this.listener(message)
  }

  private standings(): PlayerView[] {
    return [...this.players.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  }

  private sendLobby() {
    this.broadcast({ t: 'lobby', players: this.standings(), settings: this.settings, phase: this.phase })
  }

  setRounds(rounds: number) {
    this.settings = { rounds }
    this.sendLobby()
  }

  /** Picks the songs (easy → hard), makes sure each has playable audio, and starts round 1. */
  async start(pool: Song[]) {
    let songs = buildRun(pool, Math.random, this.settings.rounds)
    prefetchPreviews(songs)
    const previews = await Promise.all(songs.map((song) => getPreview(song)))
    const used = new Set(songs.map((s) => s.id))
    songs = await Promise.all(songs.map(async (song, i) => {
      if (previews[i]) return song
      for (const candidate of pool) {
        if (used.has(candidate.id) || Math.abs(candidate.popularity - song.popularity) > 10) continue
        used.add(candidate.id)
        if (await getPreview(candidate)) return candidate
      }
      return song
    }))
    this.songs = songs
    for (const player of this.players.values()) player.score = 0
    for (const [id, player] of this.players) if (!player.connected) this.players.delete(id)
    this.phase = 'playing'
    this.index = -1
    this.sendLobby()
    this.nextRound()
  }

  nextRound() {
    if (this.roundOpen) return
    if (this.index >= this.songs.length - 1) { this.finish(); return }
    this.index += 1
    this.answers = new Map()
    this.roundOpen = true
    this.roundStarted = performance.now()
    const song = this.songs[this.index]
    this.broadcast({ t: 'round', index: this.index, total: this.songs.length, songId: song.id, nextSongId: this.songs[this.index + 1]?.id, durationMs: ROUND_MS })
    window.clearTimeout(this.roundTimer)
    this.roundTimer = window.setTimeout(() => this.endRound(), ROUND_MS + GRACE_MS)
  }

  submit(id: string, answer: Omit<Answer, 'points'> & { index: number }) {
    if (!this.roundOpen || answer.index !== this.index || this.answers.has(id) || !this.players.has(id)) return
    const seconds = Math.min(30, Math.max(0.1, Number(answer.seconds) || 30))
    const wrong = Math.max(0, Math.floor(Number(answer.wrong) || 0))
    const points = answer.outcome === 'named' ? songPoints(seconds, wrong) : 0
    this.answers.set(id, { outcome: answer.outcome, seconds, wrong, elapsed: Math.max(0, Number(answer.elapsed) || 0), points })
    this.broadcast({ t: 'status', answered: [...this.answers.keys()] })
    this.checkRoundDone()
  }

  private checkRoundDone() {
    if (!this.roundOpen) return
    const waiting = [...this.players.values()].filter((p) => p.connected && !this.answers.has(p.id))
    if (waiting.length === 0) this.endRound()
  }

  private endRound() {
    if (!this.roundOpen) return
    this.roundOpen = false
    window.clearTimeout(this.roundTimer)
    const results: RoundResult[] = []
    for (const player of this.players.values()) {
      const answer = this.answers.get(player.id) ?? { outcome: 'timeout' as const, seconds: 30, wrong: 0, elapsed: ROUND_MS / 1000, points: 0 }
      player.score += answer.points
      results.push({ id: player.id, name: player.name, ...answer })
    }
    results.sort((a, b) => b.points - a.points || a.elapsed - b.elapsed)
    const last = this.index >= this.songs.length - 1
    this.broadcast({ t: 'reveal', index: this.index, total: this.songs.length, songId: this.songs[this.index].id, results, standings: this.standings(), last })
  }

  finish() {
    this.phase = 'ended'
    this.roundOpen = false
    window.clearTimeout(this.roundTimer)
    this.broadcast({ t: 'end', standings: this.standings() })
  }

  /** Back to the lobby with the same players, ready for another game. */
  backToLobby() {
    this.phase = 'lobby'
    this.index = -1
    for (const player of this.players.values()) player.score = 0
    for (const [id, player] of this.players) if (!player.connected) this.players.delete(id)
    this.sendLobby()
  }

  close() {
    window.clearTimeout(this.roundTimer)
    for (const conn of this.conns.values()) conn.close()
    this.peer.destroy()
  }
}

/* ---------------------------------------------------------------- Player */

export class ClientRoom {
  private peer: PeerType
  private conn: DataConnection
  private closedByUs = false

  static async join(code: string, name: string, listener: Listener, onClose: (reason: string) => void): Promise<ClientRoom> {
    const peer = await createPeer()
    return new Promise((resolve, reject) => {
      const conn = peer.connect(ID_PREFIX + cleanCode(code), { reliable: true })
      const timer = window.setTimeout(() => { peer.destroy(); reject(new Error('Couldn’t find that room. Check the code and that the host is still in the lobby.')) }, 12_000)
      peer.on('error', (error: Error & { type?: string }) => {
        window.clearTimeout(timer)
        peer.destroy()
        reject(error.type === 'peer-unavailable' ? new Error('No room with that code. Check the code with your host.') : error)
      })
      conn.on('open', () => {
        window.clearTimeout(timer)
        const room = new ClientRoom(peer, conn, listener, onClose)
        conn.send({ t: 'hello', name: cleanName(name) } satisfies ClientMessage)
        resolve(room)
      })
    })
  }

  private constructor(peer: PeerType, conn: DataConnection, listener: Listener, onClose: (reason: string) => void) {
    this.peer = peer
    this.conn = conn
    conn.on('data', (data) => {
      const message = data as ServerMessage
      listener(message)
      if (message.t === 'error' && message.fatal) { this.closedByUs = true; this.close() }
    })
    const closed = () => { if (!this.closedByUs) onClose('The host closed the room or lost connection.') }
    conn.on('close', closed)
    conn.on('error', closed)
    peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect() })
  }

  answer(message: Extract<ClientMessage, { t: 'answer' }>) {
    if (this.conn.open) this.conn.send(message)
  }

  close() {
    this.closedByUs = true
    this.conn.close()
    this.peer.destroy()
  }
}
