import { Check } from 'lucide-react'

export default function StepIndicator({
  steps,
  current,
  onJump,
}: {
  steps: string[]
  current: number
  onJump: (index: number) => void
}) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1.5">
        {steps.map((label, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'todo'
          return (
            <li key={label} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onJump(i)}
                disabled={i > current}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  state === 'active'
                    ? 'bg-brand-700 text-white'
                    : state === 'done'
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-plane text-ink-muted'
                } ${i > current ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] ${
                    state === 'active' ? 'bg-white text-brand-700' : state === 'done' ? 'bg-brand-600 text-white' : 'bg-white text-ink-muted'
                  }`}
                >
                  {state === 'done' ? <Check size={11} strokeWidth={3} /> : i + 1}
                </span>
                <span className="whitespace-nowrap">{label}</span>
              </button>
              {i < steps.length - 1 && <span className="h-px w-3 shrink-0 bg-line" />}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
