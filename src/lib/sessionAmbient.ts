/**
 * Seamless-loop brown noise + subtle low “drone” for session ambience.
 * All levels kept very low; fade-in / fade-out on the master gain only.
 */

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  return AC ? new AC() : null
}

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
 * Call from a user gesture (e.g. Start). Resumes AudioContext as needed.
 */
export function createSessionAmbient(options: CreateSessionAmbientOptions): SessionAmbientHandle | null {
  const ctx = getAudioContext()
  if (!ctx) return null

  const { peakGain, fadeInSec } = options
  const master = ctx.createGain()
  master.gain.value = 0

  const noiseBuf = makeLoopableBrownBuffer(ctx, 3.2)
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuf
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

  const t0 = ctx.currentTime
  noise.start(t0)
  om.start(t0)

  const noisePeak = peakGain
  const omPeak = peakGain * 0.22

  void ctx.resume().catch(() => {})

  master.gain.linearRampToValueAtTime(noisePeak, t0 + Math.max(0.05, fadeInSec))
  omGain.gain.linearRampToValueAtTime(omPeak, t0 + Math.max(0.05, fadeInSec))

  let disposed = false

  const fadeOut = (durationSec: number) => {
    if (disposed) return
    const t = ctx.currentTime
    try {
      master.gain.cancelScheduledValues(t)
      const now = master.gain.value
      master.gain.setValueAtTime(now, t)
      master.gain.linearRampToValueAtTime(0, t + Math.max(0.05, durationSec))
      omGain.gain.cancelScheduledValues(t)
      omGain.gain.setValueAtTime(omGain.gain.value, t)
      omGain.gain.linearRampToValueAtTime(0, t + Math.max(0.05, durationSec))
    } catch {
      /* ignore */
    }
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    try {
      noise.stop()
      om.stop()
      noise.disconnect()
      om.disconnect()
      noiseFilter.disconnect()
      omGain.disconnect()
      master.disconnect()
    } catch {
      /* ignore */
    }
    void ctx.close().catch(() => {})
  }

  return { fadeOut, dispose }
}
