import type { BreathCycleDurations } from '../hooks/useBreathCycle'

export const MAX_INTERVAL_SEC = 120
export const MIN_ROUNDS = 1
export const MAX_ROUNDS = 32
export const DEFAULT_PREP_ROUNDS = 8

export const clampPrepSec = (n: number) =>
  Math.min(MAX_INTERVAL_SEC, Math.max(0, Number.isFinite(n) ? Math.round(n) : 0))

export const clampPrepRounds = (n: number) =>
  Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, Number.isFinite(n) ? Math.round(n) : MIN_ROUNDS))

export const sumCycleSeconds = (durations: BreathCycleDurations) =>
  durations.reduce((sum, sec) => sum + Math.max(0, sec), 0)
