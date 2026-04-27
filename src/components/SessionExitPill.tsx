import { motion } from 'framer-motion'

import { TOP_EXIT_DRAG_THRESHOLD_PX } from '../constants/gestures'
import { layoutTransition } from '../constants/motion'

type SessionExitPillProps = {
  onExit: () => void
}

/**
 * Top pill: vertical drag only. Exit fires after TOP_EXIT_DRAG_THRESHOLD_PX downward travel.
 */
export const SessionExitPill = ({ onExit }: SessionExitPillProps) => (
  <motion.div
    layout
    drag="y"
    dragConstraints={{ top: 0, bottom: 240 }}
    dragElastic={0.12}
    onDragEnd={(_, info) => {
      if (info.offset.y > TOP_EXIT_DRAG_THRESHOLD_PX) {
        onExit()
      }
    }}
    transition={layoutTransition}
    className="mt-3 cursor-grab rounded-full bg-white/5 px-4 py-1 text-[10px] tracking-[0.2em] text-cyan-100/35 active:cursor-grabbing"
  >
    SWIPE DOWN
  </motion.div>
)
