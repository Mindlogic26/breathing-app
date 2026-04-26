import { useMemo } from 'react'

import type { BreathPhase } from './useBreathCycle'

type OrbAnimationOptions = {
  phase: BreathPhase
  phaseDurationMs: number
  isSessionActive: boolean
}

/** Orb surface: scale + opacity only. Color pulse lives on the backdrop-glow layer behind it. */
export const useOrbAnimation = ({
  phase,
  phaseDurationMs,
  isSessionActive,
}: OrbAnimationOptions) => {
  return useMemo(() => {
    if (!isSessionActive) {
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
    }

    if (phase === 'Hold In') {
      return {
        animate: {
          scale: [1.5, 1.53, 1.5],
          opacity: 1,
        },
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      }
    }

    if (phase === 'Hold Out') {
      return {
        animate: {
          scale: [0.8, 0.816, 0.8],
          opacity: 1,
        },
        transition: {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      }
    }

    if (phase === 'Inhale') {
      return {
        animate: {
          scale: 1.5,
          opacity: 1,
        },
        transition: {
          duration: Math.max(0.1, phaseDurationMs / 1000),
          ease: 'easeInOut' as const,
        },
      }
    }

    return {
      animate: {
        scale: 0.8,
        opacity: 1,
      },
      transition: {
        duration: Math.max(0.1, phaseDurationMs / 1000),
        ease: 'easeInOut' as const,
      },
    }
  }, [isSessionActive, phase, phaseDurationMs])
}
