/** Short pulse when the user completes a top swipe-down exit (mobile / supported devices). */
export const triggerExitHaptic = () => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(50)
  }
}
