import type { Rider } from '../../types/insurance'
import { formatYen } from '../../lib/format'
import Badge from '../common/Badge'

export default function RiderCard({ rider }: { rider: Rider }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-ink">{rider.name}</p>
        <Badge tone={rider.active ? 'good' : 'muted'}>{rider.active ? '有効' : '無効'}</Badge>
      </div>
      {rider.amount !== null && (
        <p className="mt-1 text-sm font-semibold text-ink tabular-nums">{formatYen(rider.amount)}</p>
      )}
      {rider.note && <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">{rider.note}</p>}
    </div>
  )
}
