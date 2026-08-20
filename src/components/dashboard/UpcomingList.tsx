import { Link } from 'react-router-dom'
import { CalendarClock, ChevronRight } from 'lucide-react'
import type { UpcomingItem } from '../../lib/calculations'
import { RENEWAL_SOON_THRESHOLD_DAYS } from '../../lib/calculations'
import { getCategory } from '../../lib/categories'
import { formatDate } from '../../lib/format'
import EmptyState from '../common/EmptyState'

function relativeLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}日前に経過`
  if (days === 0) return '本日'
  if (days < 60) return `あと${days}日`
  const months = Math.round(days / 30)
  return `あと${months}か月`
}

export default function UpcomingList({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h3 className="mb-3 text-sm font-bold text-ink">これからの予定</h3>
        <EmptyState
          icon={<CalendarClock size={22} />}
          title="更新・満期の予定はありません"
          description="更新日や満期日を登録すると、ここに表示されます。"
        />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h3 className="mb-1 text-sm font-bold text-ink">これからの予定</h3>
      <p className="mb-4 text-xs text-ink-muted">更新日・満期日が近い順に表示しています。</p>
      <ul className="divide-y divide-line">
        {items.slice(0, 6).map((item) => {
          const meta = getCategory(item.policy.category)
          const Icon = meta.icon
          const soon = item.days >= 0 && item.days <= RENEWAL_SOON_THRESHOLD_DAYS
          return (
            <li key={item.policy.id}>
              <Link
                to={`/policies/${item.policy.id}`}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-plane/60 -mx-1 px-1 rounded-lg"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                >
                  <Icon size={16} strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{item.policy.productName}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {item.kind === 'renewal' ? '更新日' : '満期日'}: {formatDate(item.date)}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                    soon ? 'bg-amber-50 text-amber-700' : 'bg-plane text-ink-secondary'
                  }`}
                >
                  {relativeLabel(item.days)}
                </span>
                <ChevronRight size={16} className="hidden shrink-0 text-ink-muted sm:block" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
