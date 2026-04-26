import { motion } from 'framer-motion'

import { Z_BOTTOM_SHEET } from '../constants/layers'
import { chromeFadeTransition } from '../constants/uiMotion'
import type { BreathCycleDurations } from '../hooks/useBreathCycle'
import { usePointerSwipeVertical } from '../hooks/usePointerSwipeVertical'

export type BottomSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  patternName: string
  cycleDurations: BreathCycleDurations
  totalCycleTimeSec: number
  /** Full session length: one cycle × rounds (seconds). */
  totalPlanDurationSec: number
  sessionProgress: number
  currentRound: number
  targetRounds?: number
  isSessionActive: boolean
  isUiVisible: boolean
}

const PANEL_HEIGHT = 300
const PEEK = 52

/**
 * Session details in a fixed bottom sheet. Pointer capture stops bubbling so drags here
 * never interact with the top exit pill (separate targets + propagation guard).
 */
export const BottomSheet = ({
  open,
  onOpenChange,
  patternName,
  cycleDurations,
  totalCycleTimeSec,
  totalPlanDurationSec,
  sessionProgress,
  currentRound,
  targetRounds,
  isSessionActive,
  isUiVisible,
}: BottomSheetProps) => {
  const hiddenOffset = PANEL_HEIGHT - PEEK

  const handleGestures = usePointerSwipeVertical({
    onSwipeUp: () => onOpenChange(true),
    onSwipeDown: () => onOpenChange(false),
    onTap: () => onOpenChange(!open),
  })

  const isolateSheetPointers = (event: React.PointerEvent) => {
    event.stopPropagation()
  }

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 bottom-0 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      initial={false}
      animate={{ y: open ? 0 : hiddenOffset }}
      transition={{ type: 'spring', damping: 34, stiffness: 420, mass: 0.85 }}
      style={{ height: PANEL_HEIGHT, zIndex: Z_BOTTOM_SHEET }}
    >
      <div
        className="pointer-events-auto isolate flex h-full flex-col overflow-hidden rounded-t-2xl border border-white/[0.08] bg-[#0c0c0c]/90 shadow-[0_-12px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        onPointerDown={isolateSheetPointers}
        onPointerUp={isolateSheetPointers}
        onPointerCancel={isolateSheetPointers}
      >
        <div
          role="button"
          tabIndex={0}
          className="flex touch-none cursor-pointer shrink-0 flex-col items-center gap-1.5 py-2.5 outline-none select-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/40"
          aria-expanded={open}
          aria-label={open ? 'Close session info' : 'Open session info'}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenChange(!open)
            }
          }}
          onPointerDown={handleGestures.onPointerDown}
          onPointerUp={handleGestures.onPointerUp}
          onPointerCancel={handleGestures.onPointerCancel}
        >
          <motion.div
            initial={false}
            animate={{ opacity: open || isUiVisible ? 1 : 0 }}
            transition={chromeFadeTransition}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="h-1 w-10 shrink-0 rounded-full bg-white/22" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/45">
              {open ? 'Swipe down · or tap to close' : 'Swipe up · Session info'}
            </span>
          </motion.div>
        </div>

        <motion.div
          className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-1"
          initial={false}
          animate={{ opacity: open ? 1 : 0.35 }}
          transition={{ duration: 0.25 }}
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/40">Pattern</p>
            <p className="text-base font-medium tracking-wide text-cyan-50">{patternName}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-wider text-cyan-100/45">Intervals (s)</dt>
              <dd className="mt-1 tabular-nums text-cyan-100/90">{cycleDurations.join(' · ')}</dd>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-wider text-cyan-100/45">Cycle length</dt>
              <dd className="mt-1 tabular-nums text-cyan-100/90">{totalCycleTimeSec.toFixed(1)}s</dd>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-wider text-cyan-100/45">Session total</dt>
              <dd className="mt-1 tabular-nums text-cyan-100/90">
                {totalPlanDurationSec > 0 ? `${Math.round(totalPlanDurationSec)}s` : '—'}
              </dd>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-wider text-cyan-100/45">Session</dt>
              <dd className="mt-1 text-cyan-100/90">
                {isSessionActive && targetRounds
                  ? `Round ${currentRound} / ${targetRounds}`
                  : isSessionActive
                    ? 'Open-ended'
                    : 'Idle'}
              </dd>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
              <dt className="text-[10px] uppercase tracking-wider text-cyan-100/45">Progress</dt>
              <dd className="mt-1 tabular-nums text-cyan-100/90">
                {isSessionActive && targetRounds ? `${Math.round(sessionProgress * 100)}%` : '—'}
              </dd>
            </div>
          </dl>
        </motion.div>
      </div>
    </motion.div>
  )
}
