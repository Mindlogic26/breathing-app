/**
 * Web Vibration API (`navigator.vibrate`). No-ops when `vibrate` is missing or not a function.
 *
 * **iOS / Mobile Safari:** The Vibration API is **not implemented**. This will not produce haptics on
 * iPhone regardless of call site. A native wrapper (e.g. Capacitor) would be needed for real Taptic
 * feedback on iOS.
 *
 * **Gesture / security (Android & other supporting browsers):** Where vibration is supported,
 * calling this from the **synchronous** stack of a user input handler (`onClick`, `pointerdown`,
 * etc.) is the most reliable pattern. Calls only run later (e.g. after `useEffect`, `await`, or
 * unrelated `setTimeout` ticks) may be ignored. **Start session** therefore invokes this directly
 * in the button’s `onClick` before any other work.
 */
export function triggerHapticFeedback(pattern: number | number[] = 10): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(pattern)
}
