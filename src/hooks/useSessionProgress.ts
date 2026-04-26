const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

type SessionProgressOptions = {
  isActive: boolean
  targetRounds?: number
  completedRounds: number
  phaseIndex: number
  phaseElapsedMs: number
  durationMsByPhase: number[]
}

export const useSessionProgress = ({
  isActive,
  targetRounds,
  completedRounds,
  phaseIndex,
  phaseElapsedMs,
  durationMsByPhase,
}: SessionProgressOptions) => {
  if (!isActive || !targetRounds) {
    return {
      progress: 0,
      completedRounds: 0,
      currentRound: 0,
    }
  }

  const safeTargetRounds = Math.max(1, targetRounds)
  const totalCycleTimeMs = durationMsByPhase.reduce((sum, ms) => sum + Math.max(0, ms), 0)
  const elapsedBeforePhase = durationMsByPhase
    .slice(0, phaseIndex)
    .reduce((sum, ms) => sum + Math.max(0, ms), 0)
  const elapsedInRound = elapsedBeforePhase + Math.max(0, phaseElapsedMs)
  const partialRoundProgress =
    totalCycleTimeMs > 0 ? clamp(elapsedInRound / totalCycleTimeMs, 0, 0.999999) : 0

  const progress =
    completedRounds >= safeTargetRounds
      ? 1
      : clamp((completedRounds + partialRoundProgress) / safeTargetRounds, 0, 1)

  return {
    progress,
    completedRounds,
    currentRound: Math.min(completedRounds + 1, safeTargetRounds),
  }
}
