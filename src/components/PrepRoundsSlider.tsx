import { clampPrepRounds, MAX_ROUNDS, MIN_ROUNDS } from '../lib/prepConstraints'

type PrepRoundsSliderProps = {
  value: number
  onChange: (rounds: number) => void
  /** Larger touch targets and track for full-screen prep. */
  comfortable?: boolean
}

/** Global rounds control — shown during session prep (optionally full-screen). */
export const PrepRoundsSlider = ({ value, onChange, comfortable }: PrepRoundsSliderProps) => {
  const pad = comfortable ? 'py-4' : 'py-3'
  const track = comfortable ? 'h-3 rounded-full' : 'h-2 rounded-full'
  const label = comfortable ? 'text-xs' : 'text-[10px]'
  const inputNum = comfortable
    ? 'w-[4.5rem] py-2 text-base'
    : 'w-16 py-1.5 text-sm'

  return (
    <div className={`space-y-3 border-t border-white/[0.06] px-0 ${pad}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`${label} uppercase tracking-wider text-cyan-100/45`}>Rounds</span>
        <input
          type="number"
          min={MIN_ROUNDS}
          max={MAX_ROUNDS}
          step={1}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(clampPrepRounds(Number(e.target.value)))}
          className={`rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 text-center tabular-nums text-cyan-50 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/35 ${inputNum}`}
        />
      </div>
      <input
        type="range"
        min={MIN_ROUNDS}
        max={MAX_ROUNDS}
        step={1}
        value={value}
        onChange={(e) => onChange(clampPrepRounds(Number(e.target.value)))}
        className={`${track} w-full min-h-[44px] cursor-pointer appearance-none bg-white/[0.08] accent-cyan-400 touch-manipulation`}
      />
    </div>
  )
}
