import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import type { ComparisonGroup } from '../../lib/compare'
import { getCategory } from '../../lib/categories'
import { segmentColor } from '../../lib/color'
import { formatYen, formatYenPerDay } from '../../lib/format'

export default function ComparisonBar({ group }: { group: ComparisonGroup }) {
  const meta = getCategory(group.category)
  const Icon = meta.icon
  const formatAmount = (v: number) => (group.unit === '円/日' ? formatYenPerDay(v) : formatYen(v))
  const overlapping = group.items.length > 1

  return (
    <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
          >
            <Icon size={17} strokeWidth={2.25} />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">{meta.label}</p>
            <p className="text-[11px] text-ink-muted">{group.headlineLabel}の合計</p>
          </div>
        </div>
        <p className="text-xl font-bold text-ink tabular-nums">{formatAmount(group.total)}</p>
      </div>

      <div className="mt-4 flex h-8 w-full gap-0.5 overflow-hidden rounded-lg">
        {group.items.map((item, i) => (
          <div
            key={item.policy.id}
            style={{
              width: `${(item.amount / group.total) * 100}%`,
              backgroundColor: segmentColor(meta.color, i),
            }}
            title={`${item.policy.insurerName} ${item.policy.productName}: ${formatAmount(item.amount)}`}
          />
        ))}
      </div>

      <ul className="mt-3 space-y-1.5">
        {group.items.map((item, i) => (
          <li key={item.policy.id} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: segmentColor(meta.color, i) }}
            />
            <Link to={`/policies/${item.policy.id}`} className="min-w-0 flex-1 truncate font-medium text-ink hover:underline">
              {item.policy.insurerName} ・ {item.policy.productName}
            </Link>
            <span className="shrink-0 font-semibold text-ink-secondary tabular-nums">{formatAmount(item.amount)}</span>
          </li>
        ))}
      </ul>

      {overlapping && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-plane px-3.5 py-2.5 text-xs leading-relaxed text-ink-secondary">
          <Info size={14} className="mt-0.5 shrink-0" />
          複数の契約が同じ分野に登録されています。保障が重なっている可能性があります。登録内容をご確認ください。
        </p>
      )}
    </div>
  )
}
