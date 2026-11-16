import { type PanInfo, AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

import { BottomSheet } from './components/BottomSheet'
import BreathingOrb from './components/BreathingOrb'
import { OrbSessionRing } from './components/OrbSessionRing'
import { type BreathPattern, ConfigDrawer } from './components/ConfigDrawer'
import { FilmGrainOverlay } from './components/FilmGrainOverlay'
import { SessionExitPill } from './components/SessionExitPill'
import {
  Z_CONFIG_BACKDROP,
  Z_CONFIG_DRAWER,
  Z_ORB_LAYER,
  Z_SESSION_CHROME,
  Z_SESSION_LABEL,
} from './constants/layers'
import { layoutTransition } from './constants/motion'
import { chromeFadeTransition } from './constants/uiMotion'
import type { BreathCycleDurations, UseBreathCyclePattern } from './hooks/useBreathCycle'
import { useBreathSession } from './hooks/useBreathSession'
import { useTouchRevealUi } from './hooks/useTouchRevealUi'
import {
  clampPrepRounds,
  DEFAULT_PREP_ROUNDS,
  maxRoundsForCycle,
  sumCycleSeconds,
} from './lib/prepConstraints'
import {
  createSessionAmbient,
  playCompletionBell,
  type SessionAmbientHandle,
  unlockAudio,
} from './lib/sessionAmbient'

const CUSTOM_PATTERN_ID = 'custom'
const DEFAULT_CUSTOM_DURATIONS: BreathCycleDurations = [4, 4, 4, 4]
const CONFIG_OPEN_SWIPE_THRESHOLD = 56

const PATTERNS: BreathPattern[] = [
  {
    id: 'box',
    name: 'Box',
    subtitle: 'Balanced 4-4-4-4',
    durations: [4, 4, 4, 4],
  },
  {
    id: '478',
    name: '4-7-8',
    subtitle: 'Calming 4-7-8-0',
    durations: [4, 7, 8, 0],
  },
  {
    id: 'coherent',
    name: 'Coherent',
    subtitle: 'Slow 5-0-5-0',
    durations: [5, 0, 5, 0],
  },
  {
    id: CUSTOM_PATTERN_ID,
    name: 'Custom',
    subtitle: 'Your intervals & rounds',
    durations: DEFAULT_CUSTOM_DURATIONS,
  },
]

declare global {
  interface Window {
    /** TEMPORARY: App render (commit) count, read from outside to check the session doesn't re-render per frame. */
    __breathRenders?: number
  }
}

function App() {
  // TEMPORARY render counter, shipped in the normal build on purpose so it can be measured on the
  // deployed app. Counts commits (in production every render commits). Remove once verified.
  useEffect(() => {
    window.__breathRenders = (window.__breathRenders ?? 0) + 1
  })

  const [isSessionActive, setSessionActive] = useState(false)
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)
  const [activePatternId, setActivePatternId] = useState<string>(PATTERNS[0].id)
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const [isCustomSession, setIsCustomSession] = useState(false)
  const [activeCustomDurations, setActiveCustomDurations] =
    useState<BreathCycleDurations>(DEFAULT_CUSTOM_DURATIONS)
  const [activeSessionRounds, setActiveSessionRounds] = useState(DEFAULT_PREP_ROUNDS)
  const [customDraftDurations, setCustomDraftDurations] =
    useState<BreathCycleDurations>(DEFAULT_CUSTOM_DURATIONS)
  const [prepRounds, setPrepRounds] = useState(DEFAULT_PREP_ROUNDS)
  const { isUiVisible, revealUi } = useTouchRevealUi(4000)

  const activePattern =
    PATTERNS.find((pattern) => pattern.id === activePatternId) ?? PATTERNS[0]

  const prepIntervals = useMemo((): BreathCycleDurations => {
    if (activePatternId === CUSTOM_PATTERN_ID) return customDraftDurations
    return activePattern.durations
  }, [activePatternId, activePattern.durations, customDraftDurations])

  const prepMaxRounds = maxRoundsForCycle(prepIntervals)
  /** A 0s cycle (all Custom intervals at 0) never advances: phase, orb and ring stay frozen. */
  const canStartSession = sumCycleSeconds(prepIntervals) > 0

  const prepTotalSessionSec = useMemo(
    () => sumCycleSeconds(prepIntervals) * prepRounds,
    [prepIntervals, prepRounds],
  )

  /** Switching pattern can lower the max (e.g. Coherent 60 → 4-7-8 32): clamp rounds in the same update. */
  const handleActivePatternIdChange = (id: string) => {
    const durations =
      id === CUSTOM_PATTERN_ID
        ? customDraftDurations
        : (PATTERNS.find((pattern) => pattern.id === id) ?? PATTERNS[0]).durations
    setActivePatternId(id)
    setPrepRounds((rounds) => clampPrepRounds(rounds, maxRoundsForCycle(durations)))
  }

  /** Lengthening Custom intervals lowers its max: clamp rounds alongside. */
  const handleCustomDraftChange = (durations: BreathCycleDurations) => {
    setCustomDraftDurations(durations)
    if (activePatternId === CUSTOM_PATTERN_ID) {
      setPrepRounds((rounds) => clampPrepRounds(rounds, maxRoundsForCycle(durations)))
    }
  }

  const idleCyclePattern = useMemo((): UseBreathCyclePattern => {
    if (activePatternId === CUSTOM_PATTERN_ID) return customDraftDurations
    return activePattern.durations
  }, [activePatternId, activePattern.durations, customDraftDurations])

  const cyclePattern = useMemo(
    () =>
      isSessionActive && isCustomSession
        ? { customPattern: { durations: activeCustomDurations } }
        : isSessionActive
          ? activePattern.durations
          : idleCyclePattern,
    [
      isSessionActive,
      isCustomSession,
      activeCustomDurations,
      activePattern.durations,
      idleCyclePattern,
    ],
  )

  const breath = useBreathSession(cyclePattern, {
    isActive: isSessionActive,
    targetRounds: isSessionActive ? activeSessionRounds : undefined,
  })

  const sessionNaturallyComplete =
    isSessionActive &&
    activeSessionRounds > 0 &&
    breath.completedRounds >= activeSessionRounds

  const completionChimePlayedRef = useRef(false)
  const ambientRef = useRef<SessionAmbientHandle | null>(null)
  const ambientDisposeTimeoutRef = useRef<number | null>(null)
  const ambientPostCompleteDisposeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!sessionNaturallyComplete) return
    if (completionChimePlayedRef.current) return
    completionChimePlayedRef.current = true

    // Reuses the context unlocked by the Start tap (shared with the ambience).
    playCompletionBell()
  }, [sessionNaturallyComplete])

  useEffect(() => {
    if (!sessionNaturallyComplete) return
    ambientRef.current?.fadeOut(4)
  }, [sessionNaturallyComplete])

  /** After natural completion, ambient gain reaches ~0 at ~4s — dispose shortly after so we don’t hold an AudioContext until Close. */
  useEffect(() => {
    if (!sessionNaturallyComplete) {
      if (ambientPostCompleteDisposeRef.current !== null) {
        window.clearTimeout(ambientPostCompleteDisposeRef.current)
        ambientPostCompleteDisposeRef.current = null
      }
      return
    }
    const id = window.setTimeout(() => {
      ambientRef.current?.dispose()
      ambientRef.current = null
      ambientPostCompleteDisposeRef.current = null
    }, 4300)
    ambientPostCompleteDisposeRef.current = id
    return () => {
      window.clearTimeout(id)
      if (ambientPostCompleteDisposeRef.current === id) {
        ambientPostCompleteDisposeRef.current = null
      }
    }
  }, [sessionNaturallyComplete])

  useEffect(() => {
    if (!isSessionActive) completionChimePlayedRef.current = false
  }, [isSessionActive])

  useEffect(() => {
    return () => {
      if (ambientDisposeTimeoutRef.current !== null) {
        window.clearTimeout(ambientDisposeTimeoutRef.current)
      }
      if (ambientPostCompleteDisposeRef.current !== null) {
        window.clearTimeout(ambientPostCompleteDisposeRef.current)
      }
      ambientRef.current?.dispose()
      ambientRef.current = null
    }
  }, [])

  const sheetCycleDurations =
    isSessionActive && isCustomSession ? activeCustomDurations : activePattern.durations

  const sheetTargetRounds = isSessionActive ? activeSessionRounds : undefined

  const cycleSecActive = breath.totalCycleTimeMs / 1000
  const totalPlanDurationSec = useMemo(() => {
    if (isSessionActive && sheetTargetRounds) {
      return cycleSecActive * sheetTargetRounds
    }
    return prepTotalSessionSec
  }, [isSessionActive, sheetTargetRounds, cycleSecActive, prepTotalSessionSec])

  const handleGlobalPan = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const isVerticalSwipe = Math.abs(info.offset.y) > Math.abs(info.offset.x)
    const shouldOpenConfig =
      !isSessionActive &&
      !configDrawerOpen &&
      isVerticalSwipe &&
      info.offset.y >= CONFIG_OPEN_SWIPE_THRESHOLD

    if (shouldOpenConfig) {
      setConfigDrawerOpen(true)
    }
  }

  const handleStartSession = () => {
    if (!canStartSession) return
    // Must run synchronously inside the tap (iOS): audio session + silent buffer + resume.
    unlockAudio()

    if (ambientDisposeTimeoutRef.current !== null) {
      window.clearTimeout(ambientDisposeTimeoutRef.current)
      ambientDisposeTimeoutRef.current = null
    }
    if (ambientPostCompleteDisposeRef.current !== null) {
      window.clearTimeout(ambientPostCompleteDisposeRef.current)
      ambientPostCompleteDisposeRef.current = null
    }
    ambientRef.current?.dispose()
    ambientRef.current = createSessionAmbient({ peakGain: 0.052, fadeInSec: 3.5 })

    const rounds = clampPrepRounds(prepRounds, prepMaxRounds)
    setPrepRounds(rounds)
    setActiveSessionRounds(rounds)
    if (activePatternId === CUSTOM_PATTERN_ID) {
      setActiveCustomDurations(customDraftDurations)
      setIsCustomSession(true)
    } else {
      setIsCustomSession(false)
    }
    setConfigDrawerOpen(false)
    setConfirmEndOpen(false)
    setSessionActive(true)
    setSessionSheetOpen(false)
  }

  const handleEndSession = () => {
    ambientRef.current?.fadeOut(1.85)
    if (ambientDisposeTimeoutRef.current !== null) {
      window.clearTimeout(ambientDisposeTimeoutRef.current)
    }
    ambientDisposeTimeoutRef.current = window.setTimeout(() => {
      ambientRef.current?.dispose()
      ambientRef.current = null
      ambientDisposeTimeoutRef.current = null
    }, 2000)

    if (isCustomSession) {
      setCustomDraftDurations(activeCustomDurations)
    }
    setIsCustomSession(false)
    setSessionActive(false)
    setConfigDrawerOpen(false)
    setConfirmEndOpen(false)
  }

  return (
    <div className="relative min-h-screen max-w-[100vw] bg-[#0a0a0a]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_92%_82%_at_50%_42%,#1a1f35_0%,#12131f_35%,#0e0f14_55%,#0a0a0a_100%)]"
      />
      <LayoutGroup id="breath-root">
        <motion.div
          layout
          className="relative z-[5] min-h-[100dvh] w-full"
          transition={layoutTransition}
          onPointerDown={revealUi}
          onPan={handleGlobalPan}
          style={!isSessionActive && !configDrawerOpen ? { touchAction: 'none' } : undefined}
        >
          <motion.div
            className="pointer-events-none fixed inset-0 flex items-center justify-center"
            style={{ zIndex: Z_ORB_LAYER }}
            initial={false}
            animate={{
              scale: !isSessionActive ? 1 : sessionNaturallyComplete ? 0.7 : 1,
              opacity: !isSessionActive ? 1 : sessionNaturallyComplete ? 0 : 1,
            }}
            transition={{
              duration: sessionNaturallyComplete ? 4 : 0.35,
              ease: 'easeInOut',
            }}
          >
            <div className="pointer-events-none relative isolate inline-grid grid-cols-1 grid-rows-1 place-items-center overflow-visible">
              {isSessionActive ? (
                <div
                  className="pointer-events-none col-start-1 row-start-1 z-0 flex items-center justify-center"
                  aria-hidden
                >
                  <OrbSessionRing
                    completedRounds={breath.completedRounds}
                    roundProgressMv={breath.roundProgressMv}
                    targetRounds={activeSessionRounds}
                    isSessionActive={isSessionActive}
                  />
                </div>
              ) : null}
              <div className="pointer-events-none relative col-start-1 row-start-1 z-[1] flex items-center justify-center">
                <BreathingOrb
                  isSessionActive={isSessionActive}
                  freezeForSessionComplete={sessionNaturallyComplete}
                  phase={breath.phase}
                  phaseDurationMs={breath.phaseDurationMs}
                  phaseElapsedMv={breath.phaseElapsedMv}
                />
              </div>
            </div>
          </motion.div>

          {!isSessionActive && !configDrawerOpen ? (
            <div
              className="pointer-events-none fixed left-0 right-0 top-0 flex justify-center px-4 pt-[max(0.85rem,env(safe-area-inset-top))]"
              style={{ zIndex: Z_SESSION_CHROME }}
              aria-hidden
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/30">
                Swipe down to configure
              </p>
            </div>
          ) : null}

          {isSessionActive && !sessionNaturallyComplete ? (
            <>
              <button
                type="button"
                aria-label="End session"
                onClick={() => setConfirmEndOpen(true)}
                className="fixed right-4 top-[max(0.85rem,env(safe-area-inset-top))] rounded-lg px-2.5 py-1.5 text-lg font-medium leading-none text-cyan-50/45 transition-colors hover:bg-white/[0.06] hover:text-cyan-50/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                style={{ zIndex: Z_SESSION_CHROME + 1 }}
              >
                ×
              </button>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.12 }}
                className="pointer-events-none fixed left-0 right-0 flex flex-col items-center px-6 text-center"
                style={{
                  zIndex: Z_SESSION_LABEL,
                  bottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 5rem))',
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={breath.phase}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="text-4xl font-semibold tracking-wide text-white sm:text-5xl"
                    style={{
                      textShadow:
                        '0 0 10px rgba(255,255,255,0.22), 0 0 28px rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.35)',
                    }}
                  >
                    {breath.phase}
                  </motion.p>
                </AnimatePresence>
              </motion.div>
              <AnimatePresence mode="popLayout">
                <motion.div
                  key="swipe-down-zone"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    ...layoutTransition,
                    opacity: { duration: 0.28 },
                  }}
                  className="pointer-events-none fixed inset-x-0 top-0 flex h-24 items-start justify-center"
                  style={{ zIndex: Z_SESSION_CHROME }}
                >
                  <motion.div
                    initial={false}
                    animate={{ opacity: isUiVisible ? 1 : 0 }}
                    transition={chromeFadeTransition}
                    className={isUiVisible ? 'pointer-events-auto' : 'pointer-events-none'}
                  >
                    <SessionExitPill onExit={handleEndSession} />
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </>
          ) : null}

          <AnimatePresence>
            {isSessionActive && sessionNaturallyComplete ? (
              <motion.div
                key="session-complete"
                role="status"
                aria-live="polite"
                className="fixed inset-0 flex flex-col items-center justify-center gap-8 px-6"
                style={{ zIndex: Z_CONFIG_DRAWER }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 3.15, duration: 0.95, ease: 'easeOut' }}
              >
                <p className="text-center text-3xl font-semibold tracking-wide text-cyan-50 sm:text-4xl">
                  Session complete
                </p>
                <button
                  type="button"
                  onClick={handleEndSession}
                  className="touch-manipulation rounded-xl border border-white/[0.14] bg-white/[0.06] px-8 py-3 text-sm font-medium tracking-wide text-cyan-100/90 transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45"
                >
                  Close
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {isSessionActive && confirmEndOpen ? (
              <>
                <motion.button
                  type="button"
                  aria-label="Dismiss end session dialog"
                  className="fixed inset-0 bg-black/60"
                  style={{ zIndex: Z_CONFIG_BACKDROP }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmEndOpen(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="End session confirmation"
                  className="fixed left-1/2 top-1/2 w-[min(92vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/[0.12] bg-[#0a0d14]/95 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                  style={{ zIndex: Z_CONFIG_DRAWER }}
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 4 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <p className="text-base font-semibold tracking-wide text-cyan-50">End session?</p>
                  <p className="mt-1 text-sm text-cyan-100/65">
                    Your current breathing session will stop immediately.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmEndOpen(false)}
                      className="flex-1 rounded-xl border border-white/[0.12] px-3 py-2 text-sm font-medium text-cyan-100/85 transition-colors hover:bg-white/[0.06]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleEndSession}
                      className="flex-1 rounded-xl bg-cyan-500/28 px-3 py-2 text-sm font-semibold text-cyan-50 transition-colors hover:bg-cyan-500/38"
                    >
                      End session
                    </button>
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>

          {configDrawerOpen ? (
            <ConfigDrawer
              open={configDrawerOpen}
              onClose={() => setConfigDrawerOpen(false)}
              patterns={PATTERNS}
              activePatternId={activePatternId}
              customPatternId={CUSTOM_PATTERN_ID}
              onActivePatternIdChange={handleActivePatternIdChange}
              prepRounds={prepRounds}
              prepMaxRounds={prepMaxRounds}
              onPrepRoundsChange={(n) => setPrepRounds(clampPrepRounds(n, prepMaxRounds))}
              customDraftDurations={customDraftDurations}
              onCustomDraftChange={handleCustomDraftChange}
              totalSessionDurationSec={prepTotalSessionSec}
              canStartSession={canStartSession}
              onStartSession={handleStartSession}
            />
          ) : null}
        </motion.div>
      </LayoutGroup>

      <FilmGrainOverlay />

      {!configDrawerOpen ? (
        <BottomSheet
          open={sessionSheetOpen}
          onOpenChange={setSessionSheetOpen}
          patternName={activePattern.name}
          cycleDurations={sheetCycleDurations}
          totalCycleTimeSec={breath.totalCycleTimeMs / 1000}
          totalPlanDurationSec={totalPlanDurationSec}
          sessionProgressMv={breath.sessionProgressMv}
          currentRound={breath.currentRound}
          targetRounds={sheetTargetRounds}
          isSessionActive={isSessionActive}
          isUiVisible={isUiVisible}
        />
      ) : null}
    </div>
  )
}

export default App
