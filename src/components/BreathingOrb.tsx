import { motion } from 'framer-motion'

import { chromeFadeTransition } from '../constants/uiMotion'
import { useOrbAnimation } from '../hooks/useOrbAnimation'
import type { BreathPhase } from '../hooks/useBreathCycle'

type BreathingOrbProps = {
  isSessionActive: boolean
  phase: BreathPhase
  phaseDurationMs: number
  isUiVisible: boolean
}

/** Sphere read: specular top-left, core mid-tones, occlusion bottom-right — no border or ring. */
const ORB_SURFACE = [
  'radial-gradient(circle at 72% 76%, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.18) 38%, transparent 58%)',
  'radial-gradient(circle at 28% 30%, #6a7388 0%, #4a5165 10%, #3a4052 24%, #2a2e3d 44%, #1e212c 64%, #14161f 82%, #0c0d12 100%)',
].join(', ')

const BreathingOrb = ({ isSessionActive, phase, phaseDurationMs, isUiVisible }: BreathingOrbProps) => {
  const orbAnimation = useOrbAnimation({
    phase,
    phaseDurationMs,
    isSessionActive,
  })

  return (
    <>
      <motion.div
        animate={orbAnimation.animate}
        initial={false}
        transition={orbAnimation.transition}
        className="aspect-square h-52 w-52 rounded-[50%] sm:h-72 sm:w-72"
        style={{ backgroundImage: ORB_SURFACE }}
      />
      {isSessionActive ? (
        <motion.p
          initial={false}
          animate={{ opacity: isUiVisible ? 1 : 0 }}
          transition={chromeFadeTransition}
          className={`mt-32 text-center text-2xl font-medium tracking-wide text-white sm:mt-40 sm:text-3xl ${isUiVisible ? '' : 'pointer-events-none'}`}
          style={{
            textShadow:
              '0 0 10px rgba(255,255,255,0.22), 0 0 28px rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.35)',
          }}
        >
          {phase}
        </motion.p>
      ) : null}
    </>
  )
}

export default BreathingOrb
