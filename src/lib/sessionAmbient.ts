/**
 * Shared Web Audio for the app: one long-lived AudioContext, unlocked from the
 * Start tap and reused by the session ambience and the completion bell.
 *
 * iOS notes (checked on a real iPhone):
 * 1. `navigator.audioSession.type = 'playback'` so the silent switch doesn't mute us.
 * 2. Wake the context inside the tap by playing a 1-sample silent buffer, not only resume().
 * 3. Schedule sounds only once `ctx.state === 'running'` — while suspended,
 *    currentTime doesn't advance and scheduled times are meaningless.
 */

/* ------------------------------------------------------------------ */
/* Diagnostics store — no UI reads it now; subscribe to it to debug    */
/* ------------------------------------------------------------------ */

export type AudioDiagnostics = {
  /** AudioContext state, or 'none' if never created / unsupported. */
  ctxState: string
  /** 'playback' when set, 'no disponible' when the API doesn't exist, or the error. */
  audioSession: string
  /** Result of the last unlock attempt from a tap. */
  unlock: string
  ambient: string
  bell: string
}

let diagnostics: AudioDiagnostics = {
  ctxState: 'none',
  audioSession: '—',
  unlock: '—',
  ambient: '—',
  bell: '—',
}
const listeners = new Set<() => void>()

const setDiag = (patch: Partial<AudioDiagnostics>) => {
  diagnostics = { ...diagnostics, ...patch }
  listeners.forEach((l) => l())
}

export const subscribeAudioDiagnostics = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getAudioDiagnostics = () => diagnostics

/* ------------------------------------------------------------------ */
/* Shared context                                                      */
/* ------------------------------------------------------------------ */

let sharedCtx: AudioContext | null = null

const getSharedAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  if (sharedCtx && sharedCtx.state !== 'closed') return sharedCtx
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) {
    setDiag({ ctxState: 'no soportado' })
    return null
  }
  const ctx = new AC()
  ctx.addEventListener('statechange', () => setDiag({ ctxState: ctx.state }))
  sharedCtx = ctx
  setDiag({ ctxState: ctx.state })
  return ctx
}

const setPlaybackAudioSession = () => {
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
  if (!session) {
    setDiag({ audioSession: 'no disponible' })
    return
  }
  try {
    session.type = 'playback'
    setDiag({ audioSession: session.type })
  } catch (err) {
    setDiag({ audioSession: `error: ${String(err)}` })
  }
}

/**
 * MUST be called synchronously inside a user gesture (click/tap handler).
 * Sets the audio session, creates/reuses the shared context, plays a
 * 1-sample silent buffer and calls resume().
 */
export function unlockAudio(): AudioContext | null {
  setPlaybackAudioSession()
  const ctx = getSharedAudioContext()
  if (!ctx) {
    setDiag({ unlock: 'sin AudioContext' })
    return null
  }
  try {
    const silent = ctx.createBuffer(1, 1, ctx.sampleRate)
    const src = ctx.createBufferSource()
    src.buffer = silent
    src.connect(ctx.destination)
    src.start(0)
    src.onended = () => src.disconnect()
  } catch (err) {
    setDiag({ unlock: `buffer falló: ${String(err)}` })
  }
  setDiag({ unlock: `toque (estado: ${ctx.state})` })
  ctx
    .resume()
    .then(() => setDiag({ unlock: `ok (${ctx.state})`, ctxState: ctx.state }))
    .catch((err) => setDiag({ unlock: `resume falló: ${String(err)}` }))
  return ctx
}

/**
 * Runs `cb` once the context is running. Never schedules while suspended.
 * Returns a cancel function. Calls `onTimeout` if it never gets there.
 */
const whenRunning = (
  ctx: AudioContext,
  cb: () => void,
  timeoutMs: number,
  onTimeout: () => void,
): (() => void) => {
  if (ctx.state === 'running') {
    cb()
    return () => {}
  }
  let done = false
  const onChange = () => {
    if (done || ctx.state !== 'running') return
    done = true
    cleanup()
    cb()
  }
  const timer = window.setTimeout(() => {
    if (done) return
    done = true
    cleanup()
    onTimeout()
  }, timeoutMs)
  const cleanup = () => {
    window.clearTimeout(timer)
    ctx.removeEventListener('statechange', onChange)
  }
  ctx.addEventListener('statechange', onChange)
  void ctx.resume().catch(() => {})
  return () => {
    done = true
    cleanup()
  }
}

/* ------------------------------------------------------------------ */
/* Ambience                                                            */
/* ------------------------------------------------------------------ */

/** Brown-ish noise buffer with short crossfade at wrap for smoother looping. */
const makeLoopableBrownBuffer = (ctx: AudioContext, durationSec: number): AudioBuffer => {
  const rate = ctx.sampleRate
  const n = Math.max(rate, Math.floor(rate * durationSec))
  const buf = ctx.createBuffer(1, n, rate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    d[i] = last * 3.25
  }
  const x = Math.min(Math.floor(rate * 0.04), Math.floor(n / 4))
  for (let i = 0; i < x; i++) {
    const a = i / x
    const li = d[i]!
    const ri = d[n - x + i]!
    const blend = li * (1 - a) + ri * a
    d[i] = blend
    d[n - x + i] = blend
  }
  return buf
}

export type SessionAmbientHandle = {
  fadeOut: (durationSec: number) => void
  dispose: () => void
}

export type CreateSessionAmbientOptions = {
  /** Master peak after fade-in (very quiet; ~0.04–0.08 typical). */
  peakGain: number
  fadeInSec: number
}

/**
 * Call from a user gesture (e.g. Start), right after unlockAudio().
 * Nodes are only started once the shared context is running.
 */
export function createSessionAmbient(options: CreateSessionAmbientOptions): SessionAmbientHandle | null {
  const ctx = getSharedAudioContext()
  if (!ctx) {
    setDiag({ ambient: 'sin AudioContext' })
    return null
  }

  const { peakGain, fadeInSec } = options
  const master = ctx.createGain()
  master.gain.value = 0

  const noise = ctx.createBufferSource()
  noise.buffer = makeLoopableBrownBuffer(ctx, 3.2)
  noise.loop = true

  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'lowpass'
  noiseFilter.frequency.value = 780
  noiseFilter.Q.value = 0.7

  const om = ctx.createOscillator()
  om.type = 'sine'
  om.frequency.value = 136.1
  const omGain = ctx.createGain()
  omGain.gain.value = 0

  noise.connect(noiseFilter)
  noiseFilter.connect(master)
  om.connect(omGain)
  omGain.connect(master)
  master.connect(ctx.destination)

  let started = false
  let disposed = false

  setDiag({ ambient: ctx.state === 'running' ? 'arrancando' : `esperando running (${ctx.state})` })

  const cancelWait = whenRunning(
    ctx,
    () => {
      if (disposed) return
      const t0 = ctx.currentTime
      noise.start(t0)
      om.start(t0)
      master.gain.setValueAtTime(0, t0)
      omGain.gain.setValueAtTime(0, t0)
      master.gain.linearRampToValueAtTime(peakGain, t0 + Math.max(0.05, fadeInSec))
      omGain.gain.linearRampToValueAtTime(peakGain * 0.22, t0 + Math.max(0.05, fadeInSec))
      started = true
      setDiag({ ambient: 'sonando' })
    },
    5000,
    () => setDiag({ ambient: `no arrancó (estado: ${ctx.state})` }),
  )

  const fadeOut = (durationSec: number) => {
    if (disposed || !started) return
    const t = ctx.currentTime
    try {
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(0, t + Math.max(0.05, durationSec))
      omGain.gain.cancelScheduledValues(t)
      omGain.gain.setValueAtTime(omGain.gain.value, t)
      omGain.gain.linearRampToValueAtTime(0, t + Math.max(0.05, durationSec))
      setDiag({ ambient: 'fundiendo' })
    } catch {
      /* ignore */
    }
  }

  /** Stops and disconnects this ambience. The shared context stays open for the bell / next session. */
  const dispose = () => {
    if (disposed) return
    disposed = true
    cancelWait()
    try {
      if (started) {
        noise.stop()
        om.stop()
      }
      noise.disconnect()
      om.disconnect()
      noiseFilter.disconnect()
      omGain.disconnect()
      master.disconnect()
    } catch {
      /* ignore */
    }
    setDiag({ ambient: 'parado' })
  }

  return { fadeOut, dispose }
}

/* ------------------------------------------------------------------ */
/* Completion bell                                                     */
/* ------------------------------------------------------------------ */

/**
 * Plays the completion bell on the shared context (the one unlocked by Start).
 * Waits for 'running' before scheduling; reports the outcome in diagnostics.
 */
export function playCompletionBell(): void {
  const ctx = sharedCtx && sharedCtx.state !== 'closed' ? sharedCtx : null
  if (!ctx) {
    setDiag({ bell: 'sin contexto desbloqueado' })
    return
  }
  setDiag({ bell: ctx.state === 'running' ? 'programando' : `esperando running (${ctx.state})` })
  whenRunning(
    ctx,
    () => {
      try {
        const t = ctx.currentTime
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(523.25, t)
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.032, t + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.38)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.42)
        osc.onended = () => {
          osc.disconnect()
          gain.disconnect()
          setDiag({ bell: 'sonó' })
        }
        setDiag({ bell: `programada (t=${t.toFixed(2)}s)` })
      } catch (err) {
        setDiag({ bell: `error: ${String(err)}` })
      }
    },
    3000,
    () => setDiag({ bell: `bloqueada (estado: ${ctx.state})` }),
  )
}
