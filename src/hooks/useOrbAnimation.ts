import { useMemo } from 'react'

import type { BreathPhase } from './useBreathCycle'

/** Peak `scale` during an active session (Hold In). Use for fixed UI that must frame the largest orb size. */
export const ORB_SESSION_MAX_SCALE = 1.53

/** Progress ring diameter = orb base × max scale × this factor (slightly larger than peak orb). */
export const ORB_RING_DIAMETER_FACTOR = 1.08

const HOLD_OUT_PEAK_DELTA = 0.016

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** Piecewise linear keyframes in 0..1 with easeInOut between segments (matches prior Framer `times` curves). */
const piecewiseEaseTimes = (t: number, times: number[], values: number[]): number => {
  const u = clamp01(t)
  if (u <= times[0]) return values[0]
  if (u >= times[times.length - 1]) return values[values.length - 1]
  for (let i = 0; i < times.length - 1; i++) {
    const t0 = times[i]!
    const t1 = times[i + 1]!
    if (u <= t1) {
      const v0 = values[i]!
      const v1 = values[i + 1]!
      const span = t1 - t0 || 1e-6
      const w = easeInOutCubic((u - t0) / span)
      return v0 + (v1 - v0) * w
    }
  }
  return values[values.length - 1]!
}

/**
 * Session orb scale from phase progress only (no Framer keyframe restarts).
 * Endpoints are chosen so adjacent phases match at t=0 / t=1 — no visible jump between rounds.
 */
export const getSessionOrbScale = (
  phase: BreathPhase,
  phaseElapsedMs: number,
  phaseDurationMs: number,
): number => {
  const d = Math.max(1, phaseDurationMs)
  const t = clamp01(phaseElapsedMs / d)

  if (phase === 'Inhale') {
    return 0.8 + (1.5 - 0.8) * easeInOutCubic(t)
  }

  if (phase === 'Hold In') {
    return (
      1.5 + (ORB_SESSION_MAX_SCALE - 1.5) * (1 - Math.cos(Math.PI * t)) / 2
    )
  }

  if (phase === 'Exhale') {
    return piecewiseEaseTimes(
      t,
      [0, 0.08, 0.22, 1],
      [ORB_SESSION_MAX_SCALE, ORB_SESSION_MAX_SCALE, 1.5, 0.8],
    )
  }

  // Hold Out: 0.8 at t=0 and t=1 (matches exhale end and next inhale start), brief swell mid-phase
  return 0.8 + HOLD_OUT_PEAK_DELTA * (1 - Math.cos(2 * Math.PI * t)) / 2
}

/** When `sessionVisualActive` is true, orb uses time-based scale instead of this idle motion. */
export const useOrbAnimation = (sessionVisualActive: boolean) => {
  return useMemo(() => {
    if (sessionVisualActive) return null
    return {
      animate: {
        scale: [1, 1.028, 1],
        opacity: [0.88, 0.95, 0.88],
      },
      transition: {
        duration: 5.5,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    }
  }, [sessionVisualActive])
}
