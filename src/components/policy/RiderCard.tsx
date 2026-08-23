import type { Currency, Rider } from '../../types/insurance'
import { formatMoneyWithYen } from '../../lib/format'
import Badge from '../common/Badge'
import { useExchangeRate } from '../../store/ExchangeRateContext'

export default function RiderCard({ rider, currency }: { rider: Rider; currency: Currency }) {
  const { usdJpy } = useExchangeRate()
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-ink">{rider.name}</p>
        <Badge tone={rider.active ? 'good' : 'muted'}>{rider.active ? '有効' : '無効'}</Badge>
      </div>
      {rider.amount !== null && (
        <p className="mt-1 text-sm font-semibold text-ink tabular-nums">{formatMoneyWithYen(rider.amount, currency, usdJpy)}</p>
      )}
      {rider.note && <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">{rider.note}</p>}
    </div>
  )
}
