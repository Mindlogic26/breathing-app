import { useCallback, useRef } from 'react'

type VerticalSwipeHandlers = {
  onPointerDown: (event: React.PointerEvent) => void
  onPointerUp: (event: React.PointerEvent) => void
  onPointerCancel: (event: React.PointerEvent) => void
}

export const usePointerSwipeVertical = ({
  onSwipeUp,
  onSwipeDown,
  onTap,
  threshold = 40,
}: {
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onTap?: () => void
  threshold?: number
}): VerticalSwipeHandlers => {
  const startY = useRef<number | null>(null)

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    startY.current = event.clientY
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* capture unsupported or already released */
    }
  }, [])

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (startY.current === null) return
      try {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }
      } catch {
        /* ignore */
      }
      const deltaY = event.clientY - startY.current
      startY.current = null
      if (deltaY < -threshold) onSwipeUp?.()
      else if (deltaY > threshold) onSwipeDown?.()
      else onTap?.()
    },
    [onSwipeUp, onSwipeDown, onTap, threshold],
  )

  const onPointerCancel = useCallback((event: React.PointerEvent) => {
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      /* ignore */
    }
    startY.current = null
  }, [])

  return { onPointerDown, onPointerUp, onPointerCancel }
}
