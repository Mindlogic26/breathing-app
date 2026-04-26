import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_IDLE_MS = 4000

/**
 * Chrome fades after idle; any pointer down (capture) or calling revealUi() shows it again.
 */
export const useTouchRevealUi = (idleMs = DEFAULT_IDLE_MS) => {
  const [isUiVisible, setIsUiVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const revealUi = useCallback(() => {
    setIsUiVisible(true)
    clearTimer()
    timerRef.current = window.setTimeout(() => setIsUiVisible(false), idleMs)
  }, [idleMs])

  useEffect(() => {
    const onPointerDownCapture = () => {
      revealUi()
    }
    document.addEventListener('pointerdown', onPointerDownCapture, { capture: true })
    timerRef.current = window.setTimeout(() => setIsUiVisible(false), idleMs)
    return () => {
      document.removeEventListener('pointerdown', onPointerDownCapture, { capture: true })
      clearTimer()
    }
  }, [idleMs, revealUi])

  return { isUiVisible, revealUi }
}
