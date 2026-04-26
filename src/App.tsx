import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useState } from 'react'

import { BottomSheet } from './components/BottomSheet'
import BreathingOrb from './components/BreathingOrb'
import { FilmGrainOverlay } from './components/FilmGrainOverlay'
import { type BreathPattern, PatternPicker } from './components/PatternPicker'
import { SessionExitPill } from './components/SessionExitPill'
import { layoutTransition } from './constants/motion'
import { chromeFadeTransition } from './constants/uiMotion'
import { useBreathSession } from './hooks/useBreathSession'
import { useTouchRevealUi } from './hooks/useTouchRevealUi'

type AppMode = 'selecting' | 'active'

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
]

const SESSION_ROUNDS = 8

function App() {
  const [appMode, setAppMode] = useState<AppMode>('selecting')
  const [selectedPatternId, setSelectedPatternId] = useState<string>(PATTERNS[0].id)
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false)
  const { isUiVisible, revealUi } = useTouchRevealUi(4000)

  const selectedPattern =
    PATTERNS.find((pattern) => pattern.id === selectedPatternId) ?? PATTERNS[0]

  const isSessionActive = appMode === 'active'
  const breath = useBreathSession(selectedPattern.durations, {
    isActive: isSessionActive,
    targetRounds: isSessionActive ? SESSION_ROUNDS : undefined,
  })

  const startPattern = (pattern: BreathPattern) => {
    setSelectedPatternId(pattern.id)
    setAppMode('active')
    setSessionSheetOpen(false)
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
          className="relative z-[5] flex min-h-screen flex-col items-center justify-center"
          transition={layoutTransition}
          onPointerDown={revealUi}
        >
          <BreathingOrb
            isSessionActive={isSessionActive}
            phase={breath.phase}
            phaseDurationMs={breath.phaseDurationMs}
            isUiVisible={isUiVisible}
          />

          <AnimatePresence mode="popLayout">
            {appMode === 'selecting' ? (
              <PatternPicker
                key="pattern-browser"
                patterns={PATTERNS}
                selectedPatternId={selectedPatternId}
                onHoverPattern={setSelectedPatternId}
                onSelectPattern={startPattern}
              />
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="popLayout">
            {appMode === 'active' ? (
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
                className="absolute inset-x-0 top-0 flex h-24 items-start justify-center"
              >
                <motion.div
                  initial={false}
                  animate={{ opacity: isUiVisible ? 1 : 0 }}
                  transition={chromeFadeTransition}
                  className={isUiVisible ? '' : 'pointer-events-none'}
                >
                  <SessionExitPill onExit={() => setAppMode('selecting')} />
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      <FilmGrainOverlay />

      <BottomSheet
        open={sessionSheetOpen}
        onOpenChange={setSessionSheetOpen}
        patternName={selectedPattern.name}
        cycleDurations={selectedPattern.durations}
        totalCycleTimeSec={breath.totalCycleTimeMs / 1000}
        sessionProgress={breath.sessionProgress}
        currentRound={breath.currentRound}
        targetRounds={isSessionActive ? SESSION_ROUNDS : undefined}
        isSessionActive={isSessionActive}
        isUiVisible={isUiVisible}
      />
    </div>
  )
}

export default App
