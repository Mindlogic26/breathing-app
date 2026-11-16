import { type MotionValue, useTransform } from 'framer-motion'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

type SessionProgressOptions = {
  isActive: boolean
  targetRounds?: number
  completedRounds: number
  phaseIndex: number
  /** Continuous elapsed ms in the current phase (MotionValue, never React state). */
  phaseElapsedMv: MotionValue<number>
  durationMsByPhase: number[]
}

/**
 * Session progress split into discrete values (React state, re-render a few times per round)
 * and continuous ones (MotionValues, updated every frame without re-rendering).
 */
export const useSessionProgress = ({
  isActive,
  targetRounds,
  completedRounds,
  phaseIndex,
  phaseElapsedMv,
  durationMsByPhase,
}: SessionProgressOptions) => {
  const totalCycleTimeMs = durationMsByPhase.reduce((sum, ms) => sum + Math.max(0, ms), 0)
  const elapsedBeforePhase = durationMsByPhase
    .slice(0, phaseIndex)
    .reduce((sum, ms) => sum + Math.max(0, ms), 0)
  const safeTargetRounds = targetRounds ? Math.max(1, targetRounds) : 0
  const hasPlan = isActive && safeTargetRounds > 0

  /** 0..1 within the current round — drives the smooth fill of the progress ring. */
  const roundProgressMv = useTransform(phaseElapsedMv, (elapsedMs) => {
    if (!isActive || totalCycleTimeMs <= 0) return 0
    return Math.min(1, (elapsedBeforePhase + Math.max(0, elapsedMs)) / totalCycleTimeMs)
  })

  /** 0..1 across the whole session — shown as a percentage in the bottom sheet. */
  const sessionProgressMv = useTransform(roundProgressMv, (roundProgress) => {
    if (!hasPlan) return 0
    if (completedRounds >= safeTargetRounds) return 1
    return clamp((completedRounds + clamp(roundProgress, 0, 0.999999)) / safeTargetRounds, 0, 1)
  })

  return {
    roundProgressMv,
    sessionProgressMv,
    currentRound: hasPlan ? Math.min(completedRounds + 1, safeTargetRounds) : 0,
  }
}
