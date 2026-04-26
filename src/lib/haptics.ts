/** Very light tap — closest web analogue to iOS `impactLight` (~10ms). No-op where unsupported. */
export function lightImpact(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(10)
}

/** Slightly stronger acknowledgement when exiting via swipe pill. */
export function triggerExitHaptic(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate([12, 45, 18])
}
