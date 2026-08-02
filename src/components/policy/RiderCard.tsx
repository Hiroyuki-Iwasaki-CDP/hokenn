import { Check, Minus } from 'lucide-react'
import type { Rider } from '../../types/insurance'
import { formatYen } from '../../lib/format'

export default function RiderCard({ rider }: { rider: Rider }) {
  return (
    <div
      className={`rounded-xl border p-3.5 transition-colors ${
        rider.active ? 'border-brand-200 bg-brand-50/60' : 'border-line bg-plane/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-semibold ${rider.active ? 'text-ink' : 'text-ink-muted line-through'}`}>
          {rider.name}
        </p>
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
            rider.active ? 'bg-brand-600 text-white' : 'bg-stone-200 text-stone-500'
          }`}
          aria-label={rider.active ? '付帯中' : '付帯なし'}
        >
          {rider.active ? <Check size={12} strokeWidth={3} /> : <Minus size={12} strokeWidth={3} />}
        </span>
      </div>
      <p className="mt-1 text-[11px] font-semibold text-ink-muted">{rider.active ? '付帯中' : '付帯なし'}</p>
      {rider.active && rider.amount !== undefined && (
        <p className="mt-1.5 text-sm font-bold text-brand-700 tabular-nums">{formatYen(rider.amount)}</p>
      )}
      {rider.active && rider.note && <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{rider.note}</p>}
    </div>
  )
}
