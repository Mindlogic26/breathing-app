import type { BreathCycleDurations } from './useBreathCycle'
import { useBreathCycle } from './useBreathCycle'
import { useSessionProgress } from './useSessionProgress'

type UseBreathSessionOptions = {
  isActive: boolean
  targetRounds?: number
}

export const useBreathSession = (
  durations: BreathCycleDurations,
  { isActive, targetRounds }: UseBreathSessionOptions,
) => {
  const cycle = useBreathCycle(durations, isActive)
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
