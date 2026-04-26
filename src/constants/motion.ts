import type { Transition } from 'framer-motion'

/** Shared layout timing for mode switches (selecting ↔ active) — keeps motion consistent app-wide. */
export const layoutEase = [0.22, 1, 0.36, 1] as const

export const layoutTransition: Transition = {
  layout: { duration: 0.55, ease: layoutEase },
}
