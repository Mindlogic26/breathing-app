import { useEffect, useMemo, useRef, useState } from 'react'

export const PHASE_ORDER = ['Inhale', 'Hold In', 'Exhale', 'Hold Out'] as const

export type BreathPhase = (typeof PHASE_ORDER)[number]
export type BreathCycleDurations = [number, number, number, number]

const toMilliseconds = (seconds: number) => Math.max(0, seconds) * 1000

export const useBreathCycle = (durations: BreathCycleDurations, enabled: boolean) => {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseStartedAt, setPhaseStartedAt] = useState(() => window.performance.now())
  const [now, setNow] = useState(() => window.performance.now())
  const [completedRounds, setCompletedRounds] = useState(0)
  const prevEnabledRef = useRef(enabled)

  const durationMsByPhase = useMemo(
    () => durations.map((seconds) => toMilliseconds(seconds)),
    [durations],
  )

  const phase = PHASE_ORDER[phaseIndex]
  const phaseDurationMs = durationMsByPhase[phaseIndex]
  const totalCycleTimeMs = durationMsByPhase.reduce((sum, durationMs) => sum + durationMs, 0)
  const phaseElapsedMs = Math.min(Math.max(0, now - phaseStartedAt), phaseDurationMs)

  useEffect(() => {
    const wasEnabled = prevEnabledRef.current
    prevEnabledRef.current = enabled

    if (enabled === wasEnabled) return

    const t = window.performance.now()
    setPhaseIndex(0)
    setCompletedRounds(0)
    setPhaseStartedAt(t)
    setNow(t)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const timeoutId = window.setTimeout(() => {
      setPhaseStartedAt(window.performance.now())
      setPhaseIndex((prevIndex) => {
        const nextPhaseIndex = (prevIndex + 1) % PHASE_ORDER.length
        if (nextPhaseIndex === 0) {
          setCompletedRounds((previousRounds) => previousRounds + 1)
        }
        return nextPhaseIndex
      })
    }, phaseDurationMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [enabled, phaseDurationMs, phaseIndex])

  useEffect(() => {
    if (!enabled) return

    let animationFrameId: number
    const tick = (timestamp: number) => {
      setNow(timestamp)
      animationFrameId = window.requestAnimationFrame(tick)
    }

    animationFrameId = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [enabled])

  return {
    phase,
    phaseIndex,
    phaseDurationMs,
    phaseElapsedMs,
    phaseDurationSeconds: durations[phaseIndex],
    totalCycleTimeMs,
    durationMsByPhase,
    completedRounds,
  }
}
