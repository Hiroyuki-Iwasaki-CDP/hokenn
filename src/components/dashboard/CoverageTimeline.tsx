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

    const finiteEnds = withStartDate
      .map((policy) => policy.maturityDate ?? policy.renewalDate)
      .filter((date): date is string => !!date)
      .map((date) => new Date(date).getTime())

    let maxEnd = Math.max(...(finiteEnds.length > 0 ? finiteEnds : [today.getTime()]), today.getTime())
    maxEnd = Math.max(maxEnd, addYears(today, 5).getTime())

    const minStart = today.getTime()
    const span = maxEnd - minStart
    const padding = Math.max(span * 0.04, 30 * MS_PER_DAY)
    maxEnd += padding

    const rangeStart = new Date(minStart)
    const rangeEnd = new Date(maxEnd)
    const rangeMs = maxEnd - minStart
    const rows = withStartDate
      .slice()
      .sort((a, b) => new Date(a.contractDate as string).getTime() - new Date(b.contractDate as string).getTime())
      .map((policy) => {
        const endDate = policy.maturityDate ?? policy.renewalDate
        const end = endDate ? new Date(endDate).getTime() : maxEnd
        return {
          policy,
          endDate,
          endKind: policy.maturityDate ? '満期' : policy.renewalDate ? '次回更新' : '終身',
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
            棒の右端で、次回更新・満期の時期を比較できます。
          </p>
        </div>
      </div>

      {/* 各行は左に36pxのアイコンと12pxの余白があるため、年代軸も48px揃えて開始する。 */}
      <div className="mt-5 hidden sm:block sm:pl-12">
        <div className="relative h-11 border-b border-line text-[10px] text-ink-muted">
          <span className="absolute bottom-1 left-0 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-bold text-white">
            現在
          </span>
          {yearTicks.map((year) => (
            <span key={year} className="absolute top-0 -translate-x-1/2 tabular-nums" style={{ left: `${yearPct(year)}%` }}>
              {year}年
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 divide-y divide-line">
        {rows.map(({ policy, endPct, endDate, endKind }) => {
          const meta = getCategory(policy.category)
          const Icon = meta.icon
          const barWidth = endDate ? Math.max(endPct, 1.5) : 100
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
                        left: 0,
                        width: `${barWidth}%`,
                        backgroundColor: meta.color,
                        backgroundImage: endDate
                          ? undefined
                          : `linear-gradient(to right, ${meta.color}, ${meta.color} 82%, ${meta.color}55)`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex flex-col items-start gap-1 text-[11px] tabular-nums sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="whitespace-nowrap text-ink-muted">開始 {formatDate(policy.contractDate)}</span>
                    <span className="flex items-center gap-1 font-semibold text-ink-secondary sm:text-right">
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
        棒の右端が次回更新・満期の位置です。終身契約は右端まで表示しています。更新日は保障終了日ではなく、契約内容を確認する目安です。
      </p>
    </section>
  )
}
