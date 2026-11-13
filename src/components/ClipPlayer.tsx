import { useCallback, useEffect, useRef, useState } from 'react'
import type { Preview } from '../lib/preview'
import { MAX_CLIP, MIN_CLIP, clipWorth, formatPoints, formatSeconds, fromPosition, roundClip, toPosition } from '../lib/scoring'
import { loadSetting, saveSetting } from '../lib/storage'
import { CountUp, Equalizer } from './Fx'
import { isPaused, onPauseChange } from '../lib/pause'

const TICKS = [0.1, 0.5, 1, 3, 10, 30]
const JUMPS = [0.1, 0.5, 1, 3]

type Props = {
  preview: Preview | null | 'loading'
  startSeconds: number
  /** Seconds of the clip the player has unlocked. */
  unlocked: number
  /** Omit to show the whole preview with no unlocking (the answer screen). */
  onUnlock?: (seconds: number) => void
  /** Penalty already taken off this song, shown in the worth readout. */
  penalty?: number
  /** Start playing as soon as the audio is ready (the answer screen). */
  autoPlay?: boolean
  /** Called the first time the clip is played, to start the guess timer. */
  onFirstPlay?: () => void
  /** Space plays, → / D unlocks one more second, ← / A replays, while the search box isn't focused. */
  hotkeys?: boolean
  /** The audio file failed to load or decode. */
  onAudioError?: () => void
}

const typingInField = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/** Plays the start of the preview, with a logarithmic scrubber for unlocking more. */
export function ClipPlayer({ preview, startSeconds, unlocked, onUnlock, penalty = 0, autoPlay = false, onFirstPlay, hotkeys = false, onAudioError }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const frame = useRef(0)
  const played = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [dragTo, setDragTo] = useState<number | null>(null)
  const [volume, setVolume] = useState(() => loadSetting('volume', 0.7))
  const ready = preview !== 'loading' && preview !== null
  const reveal = !onUnlock
  const limit = reveal ? MAX_CLIP : unlocked
  const shown = dragTo ?? limit

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume, ready])

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current)
    audioRef.current?.pause()
    setPlaying(false)
  }, [])

  useEffect(() => stop, [stop])

  // Help (or any overlay) opened: stop the audio.
  useEffect(() => onPauseChange(stop), [stop])

  async function play(seconds = limit) {
    const audio = audioRef.current
    if (!audio || isPaused()) return
    if (!played.current) { played.current = true; onFirstPlay?.() }
    cancelAnimationFrame(frame.current)
    audio.currentTime = startSeconds
    setPosition(0)
    try {
      await audio.play()
    } catch {
      setPlaying(false)
      return
    }
    setPlaying(true)
    const tick = () => {
      const elapsed = audio.currentTime - startSeconds
      if (elapsed >= seconds || audio.ended) {
        stop()
        setPosition(Math.min(elapsed, seconds))
        return
      }
      setPosition(elapsed)
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }

  // Answer screen: let the song keep playing once it's revealed.
  useEffect(() => {
    if (autoPlay && ready) play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, ready])

  // Keyboard shortcuts while guessing.
  const latest = useRef({ play, stop, unlock: (s: number) => unlock(s), playing, unlocked })
  latest.current = { play, stop, unlock: (s: number) => unlock(s), playing, unlocked }
  useEffect(() => {
    if (!hotkeys) return
    const onKey = (event: KeyboardEvent) => {
      if (typingInField(event.target) || event.metaKey || event.ctrlKey || event.altKey || isPaused()) return
      const { play, stop, unlock, playing, unlocked } = latest.current
      const key = event.key.toLowerCase()
      if (key === ' ') {
        if (event.target instanceof HTMLButtonElement) return // Space already presses the focused button.
        event.preventDefault()
        if (playing) stop(); else play()
      }
      else if (key === 'arrowright' || key === 'd') { event.preventDefault(); unlock(Math.min(MAX_CLIP, unlocked + 1)) }
      else if (key === 'arrowleft' || key === 'a') { event.preventDefault(); play() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hotkeys])

  function unlock(seconds: number) {
    if (!onUnlock) return
    const next = Math.max(unlocked, roundClip(seconds))
    if (next > unlocked) onUnlock(next)
    if (ready) play(next)
  }

  function positionFromPointer(clientX: number): number {
    const rect = trackRef.current!.getBoundingClientRect()
    return Math.max(unlocked, fromPosition((clientX - rect.left) / rect.width))
  }

  function onPointerDown(event: React.PointerEvent) {
    if (reveal) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragTo(positionFromPointer(event.clientX))
  }

  function onPointerMove(event: React.PointerEvent) {
    if (dragTo !== null) setDragTo(positionFromPointer(event.clientX))
  }

  function onPointerUp() {
    if (dragTo === null) return
    const target = dragTo
    setDragTo(null)
    unlock(target)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (reveal) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      unlock(roundClip(unlocked * 1.3) > unlocked ? roundClip(unlocked * 1.3) : unlocked + (unlocked < 1 ? 0.1 : 0.5))
    } else if (event.key === 'End') {
      event.preventDefault()
      unlock(MAX_CLIP)
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (playing) stop()
      else play()
    }
  }

  function changeVolume(value: number) {
    setVolume(value)
    saveSetting('volume', value)
  }

  const scale = reveal ? (p: number) => p / MAX_CLIP : toPosition
  const worth = Math.max(0, clipWorth(shown) - penalty)

  return (
    <div className={`player${reveal ? ' player-reveal' : ''}${playing ? ' is-playing' : ''}`}>
      {!reveal && (
        <div className="worth">
          <span>Worth</span>
          <strong><CountUp value={worth} duration={350} format={formatPoints} /></strong>
          <span>at {formatSeconds(shown)}</span>
        </div>
      )}

      <div
        ref={trackRef}
        className={`scrubber${dragTo !== null ? ' dragging' : ''}`}
        role={reveal ? undefined : 'slider'}
        tabIndex={reveal ? -1 : 0}
        aria-label="Clip length"
        aria-valuemin={MIN_CLIP}
        aria-valuemax={MAX_CLIP}
        aria-valuenow={unlocked}
        aria-valuetext={`${formatSeconds(unlocked)} unlocked`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDragTo(null)}
        onKeyDown={onKeyDown}
      >
        <div className="scrubber-rail">
          <div className="scrubber-unlocked" style={{ width: `${scale(shown) * 100}%` }} />
          {playing && <div className="scrubber-progress" style={{ width: `${scale(Math.max(MIN_CLIP / 3, position)) * 100}%` }} />}
        </div>
        {!reveal && <div className="scrubber-handle" style={{ left: `${scale(shown) * 100}%` }} />}
        {!reveal && (
          <div className="scrubber-ticks" aria-hidden="true">
            {TICKS.map((tick) => (
              <span key={tick} style={{ left: `${toPosition(tick) * 100}%` }}>{formatSeconds(tick)}</span>
            ))}
          </div>
        )}
      </div>

      <div className="player-row">
        {!reveal ? (
          <div className="jumps">
            {JUMPS.map((seconds) => (
              <button key={seconds} className={`jump${unlocked >= seconds ? ' used' : ''}`} onClick={() => unlock(seconds)} disabled={unlocked > seconds}>
                {formatSeconds(seconds)}
              </button>
            ))}
            <button className="jump plus" onClick={() => unlock(Math.min(MAX_CLIP, unlocked + 1))} disabled={unlocked >= MAX_CLIP}>+1s</button>
          </div>
        ) : (
          <span className="time">{formatSeconds(Math.max(0, position))}</span>
        )}
        <button className={`play-button${playing ? ' playing' : ''}`} onClick={() => (playing ? stop() : play())} disabled={!ready} aria-label={playing ? 'Stop' : `Play ${formatSeconds(limit)}`}>
          {preview === 'loading' ? (
            <span className="spinner" />
          ) : playing ? (
            <Equalizer active />
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" /></svg>
          )}
        </button>
      </div>

      <label className="volume">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Z" /></svg>
        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => changeVolume(Number(e.target.value))} aria-label="Volume" />
      </label>

      {preview && preview !== 'loading' && <audio ref={audioRef} src={preview.audioUrl} preload="auto" onError={onAudioError} />}
    </div>
  )
}
