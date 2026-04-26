import { AnimatePresence, motion } from 'framer-motion'

import { Z_CONFIG_BACKDROP, Z_CONFIG_DRAWER } from '../constants/layers'
import { layoutEase } from '../constants/motion'
import type { BreathCycleDurations } from '../hooks/useBreathCycle'
import { usePointerSwipeVertical } from '../hooks/usePointerSwipeVertical'
import { startSessionHaptic } from '../lib/haptics'
import { clampPrepSec } from '../lib/prepConstraints'
import { PrepRoundsSlider } from './PrepRoundsSlider'

export type BreathPattern = {
  id: string
  name: string
  subtitle: string
  durations: BreathCycleDurations
}

const PHASE_LABELS_TOP = [
  { label: 'Inhale', index: 0 },
  { label: 'Hold In', index: 1 },
] as const
const PHASE_LABELS_BOTTOM = [
  { label: 'Exhale', index: 2 },
  { label: 'Hold Out', index: 3 },
] as const

const INTERVAL_STEP = 1

const bloomTransition = { duration: 0.38, ease: [0.25, 0.1, 0.25, 1] as const }

const sheetTransition = {
  type: 'spring' as const,
  damping: 34,
  stiffness: 400,
  mass: 0.9,
}

export { clampPrepRounds } from '../lib/prepConstraints'

type IntervalStepperProps = {
  label: string
  value: number
  onChange: (v: number) => void
}

const IntervalStepper = ({ label, value, onChange }: IntervalStepperProps) => {
  const v = clampPrepSec(value)
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-cyan-100/40">{label}</span>
      <div className="flex min-h-[44px] items-stretch overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.04]">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(clampPrepSec(v - INTERVAL_STEP))}
          className="touch-manipulation flex w-11 shrink-0 items-center justify-center text-xl font-light leading-none text-cyan-200/85 transition-colors hover:bg-white/[0.06] active:bg-white/[0.1]"
        >
          −
        </button>
        <div
          className="flex min-w-0 flex-1 select-none items-center justify-center border-x border-white/[0.06] px-1 text-lg tabular-nums tracking-tight text-cyan-50"
          aria-live="polite"
        >
          {v}
        </div>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(clampPrepSec(v + INTERVAL_STEP))}
          className="touch-manipulation flex w-11 shrink-0 items-center justify-center text-xl font-light leading-none text-cyan-200/85 transition-colors hover:bg-white/[0.06] active:bg-white/[0.1]"
        >
          +
        </button>
      </div>
    </div>
  )
}

type ConfigDrawerProps = {
  open: boolean
  onClose: () => void
  patterns: BreathPattern[]
  activePatternId: string
  customPatternId: string
  onActivePatternIdChange: (id: string) => void
  prepRounds: number
  onPrepRoundsChange: (rounds: number) => void
  customDraftDurations: BreathCycleDurations
  onCustomDraftChange: (durations: BreathCycleDurations) => void
  totalSessionDurationSec: number
  onStartSession: () => void
}

export const ConfigDrawer = ({
  open,
  onClose,
  patterns,
  activePatternId,
  customPatternId,
  onActivePatternIdChange,
  prepRounds,
  onPrepRoundsChange,
  customDraftDurations,
  onCustomDraftChange,
  totalSessionDurationSec,
  onStartSession,
}: ConfigDrawerProps) => {
  const handleGestures = usePointerSwipeVertical({
    onSwipeUp: onClose,
    threshold: 36,
  })

  const setPhase = (index: number, nextVal: number) => {
    const next = [...customDraftDurations] as BreathCycleDurations
    next[index] = clampPrepSec(nextVal)
    onCustomDraftChange(next)
  }

  const formatTotal = (sec: number) => {
    if (!Number.isFinite(sec) || sec <= 0) return '—'
    if (sec < 60) return `${Math.round(sec)}s`
    const m = Math.floor(sec / 60)
    const s = Math.round(sec % 60)
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            key="config-backdrop"
            aria-label="Close settings"
            className="fixed inset-0 cursor-default border-0 bg-black/55 backdrop-blur-[2px]"
            style={{ zIndex: Z_CONFIG_BACKDROP }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: layoutEase }}
            onClick={onClose}
          />

          <motion.div
            key="config-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Session settings"
            className="fixed inset-0 flex flex-col overflow-hidden rounded-b-[1.35rem] border border-white/[0.1] border-t-0 bg-[#08080c]/97 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            style={{ zIndex: Z_CONFIG_DRAWER }}
            initial={{ y: '-105%' }}
            animate={{ y: 0 }}
            exit={{ y: '-105%', transition: { duration: 0.42, ease: layoutEase } }}
            transition={sheetTransition}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="touch-none flex shrink-0 cursor-grab flex-col items-center pt-2 pb-1 active:cursor-grabbing"
              {...handleGestures}
            >
              <div className="h-1 w-10 shrink-0 rounded-full bg-white/25" aria-hidden />
              <span className="sr-only">Swipe up to close</span>
            </div>

            <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col px-4">
              <p className="shrink-0 px-1 pb-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100/40">
                Patterns
              </p>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
                <div className="space-y-2">
                  {patterns.map((pattern) => {
                    const isSelected = pattern.id === activePatternId
                    return (
                      <div key={pattern.id} className="space-y-0">
                        <button
                          type="button"
                          onClick={() => onActivePatternIdChange(pattern.id)}
                          className={`relative z-10 w-full rounded-xl px-4 py-3.5 text-left transition-all duration-300 ${
                            isSelected
                              ? 'bg-cyan-300/10 text-cyan-100'
                              : 'bg-white/[0.03] text-cyan-100/75 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="text-sm tracking-wide">{pattern.name}</div>
                          <div className="text-xs text-cyan-100/50">{pattern.subtitle}</div>
                        </button>

                        {pattern.id === customPatternId ? (
                          <AnimatePresence initial={false}>
                            {activePatternId === customPatternId ? (
                              <motion.div
                                key="custom-interval-bloom"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={bloomTransition}
                                className="overflow-hidden"
                              >
                                <div className="ml-1 border-l border-cyan-400/15 pl-3 pr-1 pb-1 pt-2">
                                  <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-cyan-100/35">
                                    Intervals · seconds
                                  </p>
                                  <div className="grid grid-cols-2 gap-3">
                                    {PHASE_LABELS_TOP.map(({ label, index }) => (
                                      <IntervalStepper
                                        key={label}
                                        label={label}
                                        value={customDraftDurations[index]}
                                        onChange={(val) => setPhase(index, val)}
                                      />
                                    ))}
                                  </div>
                                  <div className="mt-3 grid grid-cols-2 gap-3">
                                    {PHASE_LABELS_BOTTOM.map(({ label, index }) => (
                                      <IntervalStepper
                                        key={label}
                                        label={label}
                                        value={customDraftDurations[index]}
                                        onChange={(val) => setPhase(index, val)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-white/[0.1] bg-[#060608]/95 px-4 pt-3 backdrop-blur-md">
              <div className="mx-auto w-full max-w-lg pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <PrepRoundsSlider comfortable value={prepRounds} onChange={onPrepRoundsChange} />
                <div className="border-t border-white/[0.06] px-0 py-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/45">
                    Session configuration
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-cyan-100/70">
                    Total duration (estimate):{' '}
                    <span className="font-medium text-cyan-50">
                      {formatTotal(totalSessionDurationSec)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-cyan-100/35">One full cycle × rounds</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    startSessionHaptic()
                    onStartSession()
                  }}
                  className="mt-2 w-full rounded-2xl bg-cyan-500/28 py-[1.15rem] text-base font-semibold tracking-wide text-cyan-50 shadow-[0_8px_28px_rgba(34,211,238,0.12)] transition-colors hover:bg-cyan-500/38 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 active:bg-cyan-500/32 touch-manipulation"
                >
                  Start session
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
