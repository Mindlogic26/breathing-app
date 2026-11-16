import { useMemo } from 'react'

import type { BreathPhase } from './useBreathCycle'

/** Peak `scale` during an active session (end of Inhale / all of Hold In). Use for fixed UI that must frame the largest orb size. */
export const ORB_SESSION_MAX_SCALE = 1.53

/** Progress ring diameter = orb base × max scale × this factor (slightly larger than peak orb). */
export const ORB_RING_DIAMETER_FACTOR = 1.08

const ORB_SESSION_MIN_SCALE = 0.8

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

const easeInOutSine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t)

/**
 * Session orb scale from phase progress only (no Framer keyframe restarts).
 * Symmetric sine easing: Inhale and Exhale move over their whole duration, holds stay still.
 * Endpoints match between phases (Inhale ends at HIGH = Hold In, Exhale ends at LOW = Hold Out),
 * so there's no jump between phases or rounds.
 */
export const getSessionOrbScale = (
  phase: BreathPhase,
  phaseElapsedMs: number,
  phaseDurationMs: number,
): number => {
  const LOW = ORB_SESSION_MIN_SCALE
  const HIGH = ORB_SESSION_MAX_SCALE
  const t = clamp01(phaseElapsedMs / Math.max(1, phaseDurationMs))

  if (phase === 'Inhale') return LOW + (HIGH - LOW) * easeInOutSine(t)
  if (phase === 'Hold In') return HIGH
  if (phase === 'Exhale') return HIGH - (HIGH - LOW) * easeInOutSine(t)
  return LOW // Hold Out
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
