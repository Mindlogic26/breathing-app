import { motion } from 'framer-motion'
import { useMemo } from 'react'

import { ORB_RING_DIAMETER_FACTOR, ORB_SESSION_MAX_SCALE } from '../hooks/useOrbAnimation'

/** Gap between arc segments, as degrees of the full circle. */
const GAP_DEG = 2.5

/**
 * Up to this many rounds the ring shows one arc per round. Above it the arcs get too
 * small to count at a glance, so the ring becomes one continuous arc for the whole session.
 */
const MAX_SEGMENTED_ROUNDS = 12

/**
 * Circle radius in viewBox 0–100: r=50 → path diameter equals SVG box width (stroke may extend slightly; overflow visible).
 */
const R = 50
/** Stroke width in viewBox units — scales with fixed SVG size only (no orb transform). */
const STROKE_USER = 0.4

type OrbSessionRingProps = {
  completedRounds: number
  partialRoundProgress: number
  /** Up to MAX_SEGMENTED_ROUNDS: one arc per round. Above: one continuous arc. */
  targetRounds: number
  isSessionActive: boolean
}

const buildCompletedDashArray = (
  completed: number,
  segLen: number,
  gapLen: number,
  segmentCount: number,
): string => {
  const parts: string[] = []
  const cap = Math.min(Math.max(0, completed), segmentCount)

  for (let i = 0; i < segmentCount; i += 1) {
    if (i < cap) {
      parts.push(String(segLen), String(gapLen))
    } else {
      parts.push('0', String(segLen + gapLen))
    }
  }

  return parts.join(' ')
}

/**
 * Static viewport-centered progress ring.
 * - Up to MAX_SEGMENTED_ROUNDS: one arc per round; fills smoothly within each round.
 * - Above: one continuous arc filling over the whole session, still advancing smoothly within
 *   the current round (the only motion during long holds, e.g. 4-7-8's 7s hold).
 * Dash updates are not tweened (duration 0) so round boundaries don't interpolate into a multi-segment sweep.
 */
export const OrbSessionRing = ({
  completedRounds,
  partialRoundProgress,
  targetRounds,
  isSessionActive,
}: OrbSessionRingProps) => {
  const segmentCount = Math.max(1, Math.round(targetRounds))

  const { circ, segLen, gapLen, dasharrayTrack } = useMemo(() => {
    const c = 2 * Math.PI * R
    const gapLenLocal = (GAP_DEG / 360) * c
    const segLenLocal = (c - segmentCount * gapLenLocal) / segmentCount
    const trackParts: string[] = []
    for (let i = 0; i < segmentCount; i += 1) {
      trackParts.push(String(segLenLocal), String(gapLenLocal))
    }
    return {
      circ: c,
      segLen: segLenLocal,
      gapLen: gapLenLocal,
      dasharrayTrack: trackParts.join(' '),
    }
  }, [segmentCount])

  const completedCap = Math.min(Math.max(0, completedRounds), segmentCount)
  const safePartial = Math.min(1, Math.max(0, partialRoundProgress))

  const completedDasharray = useMemo(
    () => buildCompletedDashArray(completedCap, segLen, gapLen, segmentCount),
    [completedCap, gapLen, segLen, segmentCount],
  )

  const segmentStride = segLen + gapLen
  const currentStrokeDasharray = `${segLen * safePartial} ${circ}`
  const currentStrokeDashoffset = -completedCap * segmentStride

  if (!isSessionActive) return null

  const isContinuous = segmentCount > MAX_SEGMENTED_ROUNDS
  const sessionProgress = Math.min(1, (completedCap + safePartial) / segmentCount)

  return (
    <svg
      className="pointer-events-none block h-[calc(13rem*var(--orb-max)*var(--ring-diam))] w-[calc(13rem*var(--orb-max)*var(--ring-diam))] shrink-0 overflow-visible sm:h-[calc(18rem*var(--orb-max)*var(--ring-diam))] sm:w-[calc(18rem*var(--orb-max)*var(--ring-diam))]"
      style={{
        ['--orb-max' as string]: String(ORB_SESSION_MAX_SCALE),
        ['--ring-diam' as string]: String(ORB_RING_DIAMETER_FACTOR),
        filter: 'blur(1px)',
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {isContinuous ? (
        <g transform="rotate(-90 50 50)">
          <circle
            cx={50}
            cy={50}
            r={R}
            fill="none"
            stroke="rgba(165, 243, 252, 1)"
            strokeWidth={STROKE_USER}
            style={{ opacity: 0.2 }}
          />
          <motion.circle
            cx={50}
            cy={50}
            r={R}
            fill="none"
            stroke="rgba(165, 243, 252, 1)"
            strokeWidth={STROKE_USER}
            strokeLinecap="round"
            style={{ opacity: 0.92 }}
            animate={{ strokeDasharray: `${circ * sessionProgress} ${circ}` }}
            transition={{ duration: 0 }}
          />
        </g>
      ) : (
        <g transform="rotate(-90 50 50)">
          <circle
            cx={50}
            cy={50}
            r={R}
            fill="none"
            stroke="rgba(165, 243, 252, 1)"
            strokeWidth={STROKE_USER}
            strokeLinecap="round"
            strokeDasharray={dasharrayTrack}
            style={{ opacity: 0.2 }}
          />
          {completedCap > 0 ? (
            <circle
              cx={50}
              cy={50}
              r={R}
              fill="none"
              stroke="rgba(165, 243, 252, 1)"
              strokeWidth={STROKE_USER}
              strokeLinecap="round"
              strokeDasharray={completedDasharray}
              style={{ opacity: 0.55 }}
            />
          ) : null}
          {completedCap < segmentCount ? (
            <motion.circle
              cx={50}
              cy={50}
              r={R}
              fill="none"
              stroke="rgba(165, 243, 252, 1)"
              strokeWidth={STROKE_USER}
              strokeLinecap="round"
              style={{ opacity: 0.92 }}
              animate={{
                strokeDasharray: currentStrokeDasharray,
                strokeDashoffset: currentStrokeDashoffset,
              }}
              transition={{ duration: 0 }}
            />
          ) : null}
        </g>
      )}
    </svg>
  )
}
