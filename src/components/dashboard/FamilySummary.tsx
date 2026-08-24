import { UserRound } from 'lucide-react'
import { sumMonthlyPremiumInYen, toMonthlyPremium } from '../../lib/calculations'
import { getCategory } from '../../lib/categories'
import { formatUsd, formatYen } from '../../lib/format'
import type { InsurancePolicy } from '../../types/insurance'

export default function FamilySummary({
  policies,
  persons,
  usdJpy,
  onSelect,
}: {
  policies: InsurancePolicy[]
  persons: string[]
  usdJpy: number | null
  onSelect: (person: string) => void
}) {
  if (persons.length <= 1) return null

  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-4"><h2 className="text-sm font-bold text-ink">家族ごとの保険サマリー</h2><p className="mt-1 text-xs text-ink-muted">カードを選ぶと、その対象者の保険だけに切り替わります。</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {persons.map((person) => {
          const active = policies.filter((policy) => policy.status === 'active' && policy.insuredPersonName === person)
          const monthly = sumMonthlyPremiumInYen(active, usdJpy)
          const dollarMonthly = active.filter((policy) => policy.currency === 'USD').reduce((sum, policy) => sum + toMonthlyPremium(policy), 0)
          const exchangeRateUnavailable = usdJpy === null && dollarMonthly > 0
          const categories = [...new Set(active.map((policy) => getCategory(policy.category).shortLabel))]
          return (
            <button key={person} type="button" onClick={() => onSelect(person)} className="rounded-xl border border-line bg-plane p-4 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/50">
              <div className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2 font-bold text-ink"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700"><UserRound size={16} /></span><span className="truncate">{person}</span></span><span className="shrink-0 text-xs font-bold text-brand-700">{active.length}件</span></div>
              <p className="mt-3 text-lg font-bold text-ink">月額{exchangeRateUnavailable ? '（円建て分）' : ''} {formatYen(Math.round(monthly))}</p>
              {dollarMonthly > 0 && <p className="mt-0.5 text-[11px] font-semibold text-brand-700">{exchangeRateUnavailable ? '別途ドル建て' : 'うちドル建て'} {formatUsd(dollarMonthly)}/月</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">{categories.length > 0 ? categories.map((category) => <span key={category} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-ink-secondary">{category}</span>) : <span className="text-xs text-ink-muted">加入中の保険はありません</span>}</div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
