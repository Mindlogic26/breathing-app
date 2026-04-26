import { motion } from 'framer-motion'

import { layoutTransition } from '../constants/motion'
import type { BreathCycleDurations } from '../hooks/useBreathCycle'

export type BreathPattern = {
  id: string
  name: string
  subtitle: string
  durations: BreathCycleDurations
}

type PatternPickerProps = {
  patterns: BreathPattern[]
  selectedPatternId: string
  onHoverPattern: (id: string) => void
  onSelectPattern: (pattern: BreathPattern) => void
}

export const PatternPicker = ({
  patterns,
  selectedPatternId,
  onHoverPattern,
  onSelectPattern,
}: PatternPickerProps) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 18 }}
    transition={{
      ...layoutTransition,
      opacity: { duration: 0.32, ease: 'easeOut' },
      y: { duration: 0.32, ease: 'easeOut' },
    }}
    className="absolute inset-x-0 top-10 px-6"
  >
    <div className="isolate mx-auto w-full max-w-sm space-y-2 rounded-2xl border border-white/5 bg-black/25 p-3 backdrop-blur-sm">
      {patterns.map((pattern) => {
        const isSelected = pattern.id === selectedPatternId
        return (
          <button
            key={pattern.id}
            type="button"
            onPointerEnter={() => onHoverPattern(pattern.id)}
            onFocus={() => onHoverPattern(pattern.id)}
            onClick={() => onSelectPattern(pattern)}
            className={`w-full rounded-xl px-4 py-3 text-left transition-all duration-300 ${
              isSelected
                ? 'bg-cyan-300/10 text-cyan-100'
                : 'bg-white/[0.03] text-cyan-100/75 hover:bg-white/[0.06]'
            }`}
          >
            <div className="text-sm tracking-wide">{pattern.name}</div>
            <div className="text-xs text-cyan-100/50">{pattern.subtitle}</div>
          </button>
        )
      })}
    </div>
  </motion.div>
)
