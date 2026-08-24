import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarRange } from 'lucide-react'
import type { InsurancePolicy } from '../../types/insurance'
import { getCategory } from '../../lib/categories'
import { formatDate } from '../../lib/format'

const MS_PER_DAY = 1000 * 60 * 60 * 24

function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

export default function CoverageTimeline({ policies }: { policies: InsurancePolicy[] }) {
  const today = useMemo(() => new Date(), [])
  const withStartDate = useMemo(() => policies.filter((policy) => !!policy.contractDate), [policies])

  const { rangeStart, rangeEnd, rows, yearTicks } = useMemo(() => {
    if (withStartDate.length === 0) {
      return { rangeStart: today, rangeEnd: today, rows: [], yearTicks: [] as number[] }
    }

    const starts = withStartDate.map((policy) => new Date(policy.contractDate as string).getTime())
    const finiteEnds = withStartDate
      .map((policy) => policy.maturityDate ?? policy.renewalDate)
      .filter((date): date is string => !!date)
      .map((date) => new Date(date).getTime())

    let minStart = Math.min(...starts, today.getTime())
    let maxEnd = Math.max(...(finiteEnds.length > 0 ? finiteEnds : [today.getTime()]), today.getTime())
    maxEnd = Math.max(maxEnd, addYears(today, 5).getTime())

    const span = maxEnd - minStart
    const padding = Math.max(span * 0.04, 30 * MS_PER_DAY)
    minStart -= padding
    maxEnd += padding

    const rangeStart = new Date(minStart)
    const rangeEnd = new Date(maxEnd)
    const rangeMs = maxEnd - minStart
    const rows = withStartDate
      .slice()
      .sort((a, b) => new Date(a.contractDate as string).getTime() - new Date(b.contractDate as string).getTime())
      .map((policy) => {
        const start = new Date(policy.contractDate as string).getTime()
        const endDate = policy.maturityDate ?? policy.renewalDate
        const end = endDate ? new Date(endDate).getTime() : maxEnd
        return {
          policy,
          endDate,
          endKind: policy.maturityDate ? '満期' : policy.renewalDate ? '次回更新' : '終身',
          startPct: clampPercent(((start - minStart) / rangeMs) * 100),
          endPct: clampPercent(((end - minStart) / rangeMs) * 100),
        }
      })

    const startYear = rangeStart.getFullYear()
    const endYear = rangeEnd.getFullYear()
    const totalYears = Math.max(endYear - startYear, 1)
    const step = Math.max(1, Math.ceil(totalYears / 5))
    const yearTicks: number[] = []
    for (let year = Math.ceil(startYear / step) * step; year <= endYear; year += step) yearTicks.push(year)

    return { rangeStart, rangeEnd, rows, yearTicks }
  }, [withStartDate, today])

  const rangeMs = rangeEnd.getTime() - rangeStart.getTime()
  const todayPct = rangeMs <= 0 ? 0 : clampPercent(((today.getTime() - rangeStart.getTime()) / rangeMs) * 100)
  const yearPct = (year: number) => {
    if (rangeMs <= 0) return 0
    return clampPercent(((new Date(year, 0, 1).getTime() - rangeStart.getTime()) / rangeMs) * 100)
  }

  if (rows.length === 0) return null

  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <CalendarRange size={19} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-ink">保険期間タイムライン</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
            契約開始から、次回更新・満期までの期間を表示しています。
          </p>
        </div>
      </div>

      <div className="mt-5 hidden pl-1 sm:block">
        <div className="relative h-7 border-b border-line text-[10px] text-ink-muted">
          {yearTicks.map((year) => (
            <span key={year} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${yearPct(year)}%` }}>
              {year}年
            </span>
          ))}
          <span
            className="absolute bottom-1 -translate-x-1/2 rounded bg-brand-700 px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-white"
            style={{ left: `${todayPct}%` }}
          >
            今日
          </span>
        </div>
      </div>

      <div className="mt-2 divide-y divide-line">
        {rows.map(({ policy, startPct, endPct, endDate, endKind }) => {
          const meta = getCategory(policy.category)
          const Icon = meta.icon
          const barWidth = Math.max(endPct - startPct, 1.5)
          return (
            <Link key={policy.id} to={`/policies/${policy.id}`} className="group block py-4 first:pt-3 last:pb-0">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                >
                  <Icon size={16} strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink group-hover:text-brand-700">{policy.productName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                        {policy.insuredPersonName} ・ {meta.label} ・ {policy.insuranceCompany}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                    >
                      {endKind}
                    </span>
                  </div>

                  <div className="relative mt-3 h-3 rounded-full bg-plane">
                    <div
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        left: `${startPct}%`,
                        width: `${barWidth}%`,
                        backgroundColor: meta.color,
                        backgroundImage: endDate
                          ? undefined
                          : `linear-gradient(to right, ${meta.color}, ${meta.color} 82%, ${meta.color}55)`,
                      }}
                    />
                    <span
                      className="absolute top-1/2 z-10 h-5 w-0.5 -translate-y-1/2 bg-brand-800"
                      style={{ left: `${todayPct}%` }}
                      aria-label="今日"
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] tabular-nums">
                    <span className="text-ink-muted">開始 {formatDate(policy.contractDate)}</span>
                    <span className="flex items-center gap-1 text-right font-semibold text-ink-secondary">
                      {endDate ? `${endKind} ${formatDate(endDate)}` : '終身（保障継続中）'}
                      <ArrowRight size={12} className="shrink-0 text-ink-muted" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <p className="mt-4 rounded-xl bg-plane px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-muted">
        濃い縦線が今日です。更新日は保障終了日ではなく、契約内容を確認する目安として表示しています。
      </p>
    </section>
  )
}
