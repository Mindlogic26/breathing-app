import type { UseBreathCyclePattern } from './useBreathCycle'
import { useBreathCycle } from './useBreathCycle'
import { useSessionProgress } from './useSessionProgress'

type UseBreathSessionOptions = {
  isActive: boolean
  targetRounds?: number
}

export const useBreathSession = (
  pattern: UseBreathCyclePattern,
  { isActive, targetRounds }: UseBreathSessionOptions,
) => {
  const cycle = useBreathCycle(pattern, {
    active: isActive,
    targetRounds: isActive ? targetRounds : undefined,
  })
  const { progress: sessionProgress, currentRound } = useSessionProgress({
    isActive,
    targetRounds,
    completedRounds: cycle.completedRounds,
    phaseIndex: cycle.phaseIndex,
    phaseElapsedMs: cycle.phaseElapsedMs,
    durationMsByPhase: cycle.durationMsByPhase,
  })

  return {
    ...cycle,
    sessionProgress,
    currentRound,
  }
}
