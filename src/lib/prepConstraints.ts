import type { BreathCycleDurations } from '../hooks/useBreathCycle'

export const MAX_INTERVAL_SEC = 120
export const MIN_ROUNDS = 1
export const DEFAULT_PREP_ROUNDS = 8

/** Every pattern can reach roughly this session length at its max rounds. */
const TARGET_MAX_SESSION_SEC = 600
/** Bounds for the per-pattern max rounds (very long / very short or empty cycles). */
const MAX_ROUNDS_FLOOR = 4
const MAX_ROUNDS_CEILING = 99

export const clampPrepSec = (n: number) =>
  Math.min(MAX_INTERVAL_SEC, Math.max(0, Number.isFinite(n) ? Math.round(n) : 0))

export const sumCycleSeconds = (durations: BreathCycleDurations) =>
  durations.reduce((sum, sec) => sum + Math.max(0, sec), 0)

/**
 * Max rounds for a cycle so any pattern can run ~10 minutes:
 * Coherent 10s → 60, Box 16s → 38, 4-7-8 19s → 32. Clamped to [4, 99].
 */
export const maxRoundsForCycle = (durations: BreathCycleDurations) => {
  const cycleSec = sumCycleSeconds(durations)
  if (cycleSec <= 0) return MAX_ROUNDS_CEILING
  const rounds = Math.round(TARGET_MAX_SESSION_SEC / cycleSec)
  return Math.min(MAX_ROUNDS_CEILING, Math.max(MAX_ROUNDS_FLOOR, rounds))
}

export const clampPrepRounds = (n: number, maxRounds: number) =>
  Math.min(maxRounds, Math.max(MIN_ROUNDS, Number.isFinite(n) ? Math.round(n) : MIN_ROUNDS))
