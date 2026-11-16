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
  const { roundProgressMv, sessionProgressMv, currentRound } = useSessionProgress({
    isActive,
    targetRounds,
    completedRounds: cycle.completedRounds,
    phaseIndex: cycle.phaseIndex,
    phaseElapsedMv: cycle.phaseElapsedMv,
    durationMsByPhase: cycle.durationMsByPhase,
  })

  return {
    ...cycle,
    roundProgressMv,
    sessionProgressMv,
    currentRound,
  }
}
