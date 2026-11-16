import { type MotionValue, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

export const PHASE_ORDER = ['Inhale', 'Hold In', 'Exhale', 'Hold Out'] as const

export type BreathPhase = (typeof PHASE_ORDER)[number]
export type BreathCycleDurations = [number, number, number, number]

/** Explicit custom configuration (presets may pass a plain duration tuple instead). */
export type CustomBreathPattern = {
  durations: BreathCycleDurations
}

export type UseBreathCyclePattern = BreathCycleDurations | { customPattern: CustomBreathPattern }

const toMilliseconds = (seconds: number) => Math.max(0, seconds) * 1000

const resolveDurations = (pattern: UseBreathCyclePattern): BreathCycleDurations =>
  Array.isArray(pattern) ? pattern : pattern.customPattern.durations

type CycleState = {
  phaseIndex: number
  completedRounds: number
  phaseStartedAt: number
}

type CycleAction =
  | { type: 'reset'; t: number }
  | { type: 'advancePhase'; t: number; phaseCount: number }

const cycleReducer = (state: CycleState, action: CycleAction): CycleState => {
  switch (action.type) {
    case 'reset':
      return {
        phaseIndex: 0,
        completedRounds: 0,
        phaseStartedAt: action.t,
      }
    case 'advancePhase': {
      const nextPhaseIndex = (state.phaseIndex + 1) % action.phaseCount
      return {
        phaseIndex: nextPhaseIndex,
        phaseStartedAt: action.t,
        completedRounds: nextPhaseIndex === 0 ? state.completedRounds + 1 : state.completedRounds,
      }
    }
    default:
      return state
  }
}

export type UseBreathCycleOptions = {
  /** Master switch: false resets cycle (session ended). */
  active: boolean
  /**
   * When set with an active session, phase advancement stops once completedRounds reaches this count
   * (natural completion) without resetting state — UI can fade out while frozen on last tick.
   */
  targetRounds?: number
}

export const useBreathCycle = (pattern: UseBreathCyclePattern, options: UseBreathCycleOptions) => {
  const { active, targetRounds } = options
  const [cycle, dispatch] = useReducer(cycleReducer, undefined, () => ({
    phaseIndex: 0,
    completedRounds: 0,
    phaseStartedAt: window.performance.now(),
  }))
  /**
   * Continuous clock (performance.now() ms) as a MotionValue, not React state: it updates every
   * frame and must not re-render App. Only discrete changes (phase, rounds) live in state.
   */
  const clockMv = useMotionValue(window.performance.now())
  const prevActiveRef = useRef(active)

  const { phaseIndex, completedRounds, phaseStartedAt } = cycle

  const hasRoundCap =
    targetRounds !== undefined && targetRounds !== null && Number.isFinite(targetRounds) && targetRounds >= 1
  const mayAdvancePhases = active && (!hasRoundCap || completedRounds < Math.max(1, Math.round(targetRounds!)))

  const durationKey = (Array.isArray(pattern) ? pattern : pattern.customPattern.durations).join(',')
  const durations = useMemo(() => resolveDurations(pattern), [durationKey])

  const durationMsByPhase = useMemo(
    () => durations.map((seconds) => toMilliseconds(seconds)),
    [durationKey],
  )

  const phase = PHASE_ORDER[phaseIndex]
  const phaseDurationMs = durationMsByPhase[phaseIndex]
  const totalCycleTimeMs = durationMsByPhase.reduce((sum, durationMs) => sum + durationMs, 0)

  /**
   * Elapsed ms in the current phase, derived from the clock and the discrete phase start.
   * The transformer is re-bound on every render, so a phase change never pairs the new phase
   * with a stale elapsed value. Held at 0 once the round cap is reached (session complete).
   */
  const phaseElapsedMv: MotionValue<number> = useTransform(clockMv, (nowMs) =>
    mayAdvancePhases ? Math.min(Math.max(0, nowMs - phaseStartedAt), phaseDurationMs) : 0,
  )

  useEffect(() => {
    const wasActive = prevActiveRef.current
    prevActiveRef.current = active

    if (active === wasActive) return

    // Reset on any active transition. Ending a session clears state; starting again must
    // re-sync phaseStartedAt with the clock — otherwise idle time makes the elapsed time jump to
    // the end of the first phase and the progress ring looks partially filled.
    const t = window.performance.now()
    dispatch({ type: 'reset', t })
    clockMv.set(t)
  }, [active, clockMv])

  useEffect(() => {
    if (!active || !mayAdvancePhases) return

    const timeoutId = window.setTimeout(() => {
      const t = window.performance.now()
      dispatch({
        type: 'advancePhase',
        t,
        phaseCount: PHASE_ORDER.length,
      })
    }, phaseDurationMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [active, mayAdvancePhases, phaseDurationMs, phaseIndex])

  /** Framer's frame loop writes the clock; MotionValue subscribers update the DOM without a render. */
  const tickClock = useCallback(() => {
    if (active) clockMv.set(window.performance.now())
  }, [active, clockMv])
  useAnimationFrame(tickClock)

  return {
    phase,
    phaseIndex,
    phaseDurationMs,
    phaseElapsedMv,
    phaseDurationSeconds: durations[phaseIndex] ?? 0,
    totalCycleTimeMs,
    durationMsByPhase,
    completedRounds,
  }
}
