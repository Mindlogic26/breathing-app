import { motion, useAnimationControls, useMotionValue } from 'framer-motion'
import { useLayoutEffect } from 'react'

import { getSessionOrbScale, useOrbAnimation } from '../hooks/useOrbAnimation'
import type { BreathPhase } from '../hooks/useBreathCycle'

type BreathingOrbProps = {
  isSessionActive: boolean
  phase: BreathPhase
  phaseDurationMs: number
  phaseElapsedMs: number
  /** When true, hold the orb at its current transform (no idle scale jump) — e.g. natural session end. */
  freezeForSessionComplete?: boolean
}

/** 3D sphere read: layered radials — specular top-left, core mid-tones, occlusion bottom-right. */
const ORB_BACKGROUND = [
  'radial-gradient(circle at 72% 76%, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.18) 38%, transparent 58%)',
  'radial-gradient(circle at 28% 30%, #6a7388 0%, #4a5165 10%, #3a4052 24%, #2a2e3d 44%, #1e212c 64%, #14161f 82%, #0c0d12 100%)',
].join(', ')

/** Internal depth and soft highlight — no outer decorative ring. */
const ORB_BOX_SHADOW = [
  'inset 0 10px 26px rgba(255,255,255,0.08)',
  'inset 0 -18px 38px rgba(0,0,0,0.58)',
  'inset -10px -12px 28px rgba(0,0,0,0.38)',
  '0 24px 48px rgba(0,0,0,0.35)',
].join(', ')

const BreathingOrb = ({
  isSessionActive,
  phase,
  phaseDurationMs,
  phaseElapsedMs,
  freezeForSessionComplete = false,
}: BreathingOrbProps) => {
  const sessionVisualActive = isSessionActive || freezeForSessionComplete
  const idleConfig = useOrbAnimation(sessionVisualActive)
  const scaleMv = useMotionValue(0.8)
  const controls = useAnimationControls()

  useLayoutEffect(() => {
    if (sessionVisualActive) {
      void controls.stop()
      return
    }
    if (!idleConfig) return
    const { animate, transition } = idleConfig
    void controls.start({ ...(animate as object), transition } as Parameters<typeof controls.start>[0])
  }, [sessionVisualActive, idleConfig, controls])

  useLayoutEffect(() => {
    if (!isSessionActive || freezeForSessionComplete) return
    scaleMv.set(getSessionOrbScale(phase, phaseElapsedMs, phaseDurationMs))
  }, [isSessionActive, freezeForSessionComplete, phase, phaseElapsedMs, phaseDurationMs, scaleMv])

  return (
    <motion.div
      className="relative flex origin-center items-center justify-center will-change-transform"
      initial={false}
      animate={sessionVisualActive ? undefined : controls}
      style={sessionVisualActive ? { scale: scaleMv, opacity: 1 } : undefined}
    >
      <div
        className="relative aspect-square h-52 w-52 rounded-full sm:h-72 sm:w-72"
        style={{
          background: ORB_BACKGROUND,
          boxShadow: ORB_BOX_SHADOW,
        }}
      />
    </motion.div>
  )
}

export default BreathingOrb
