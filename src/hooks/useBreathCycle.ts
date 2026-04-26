import { useEffect, useMemo, useReducer, useRef, useState } from 'react'

import { triggerHapticFeedback } from '../lib/haptics'

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
  const [now, setNow] = useState(() => window.performance.now())
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
  const phaseElapsedMs = Math.min(Math.max(0, now - phaseStartedAt), phaseDurationMs)

  useEffect(() => {
    const wasActive = prevActiveRef.current
    prevActiveRef.current = active

    if (active === wasActive) return

    // Reset on any active transition. Ending a session clears state; starting again must
    // re-sync phaseStartedAt with `now` — otherwise idle time makes phaseElapsedMs jump to
    // the end of the first phase and the progress ring looks partially filled.
    const t = window.performance.now()
    dispatch({ type: 'reset', t })
    setNow(t)
  }, [active])

  useEffect(() => {
    if (!active || !mayAdvancePhases) return

    const timeoutId = window.setTimeout(() => {
      const t = window.performance.now()
      // Same macrotask as dispatch (not after React re-render). Still not a user gesture — see haptics.ts for iOS.
      triggerHapticFeedback(10)
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

  useEffect(() => {
    if (!active) return

    let animationFrameId: number
    const tick = (timestamp: number) => {
      setNow(timestamp)
      animationFrameId = window.requestAnimationFrame(tick)
    }

    animationFrameId = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [active])

  return {
    phase,
    phaseIndex,
    phaseDurationMs,
    phaseElapsedMs,
    phaseDurationSeconds: durations[phaseIndex] ?? 0,
    totalCycleTimeMs,
    durationMsByPhase,
    completedRounds,
  }
}
