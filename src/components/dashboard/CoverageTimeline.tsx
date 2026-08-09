import { useMemo } from 'react'
import type { InsurancePolicy } from '../../types/insurance'
import { getCategory } from '../../lib/categories'
import { formatDate } from '../../lib/format'

const MS_PER_DAY = 1000 * 60 * 60 * 24

function addYears(date: Date, years: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + years)
  return d
}

export default function CoverageTimeline({ policies }: { policies: InsurancePolicy[] }) {
  const today = useMemo(() => new Date(), [])
  const withStartDate = useMemo(() => policies.filter((p) => !!p.contractDate), [policies])

  const { rangeStart, rangeEnd, rows, yearTicks } = useMemo(() => {
    if (withStartDate.length === 0) {
      return { rangeStart: today, rangeEnd: today, rows: [], yearTicks: [] as number[] }
    }
    const starts = withStartDate.map((p) => new Date(p.contractDate as string).getTime())
    const finiteEnds = withStartDate
      .map((p) => p.renewalDate)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d).getTime())

    let minStart = Math.min(...starts, today.getTime())
    let maxEnd = Math.max(...(finiteEnds.length ? finiteEnds : [today.getTime()]), today.getTime())
    // 終身契約や余白のため、最低でも今日から5年先までは表示する
    maxEnd = Math.max(maxEnd, addYears(today, 5).getTime())

    const span = maxEnd - minStart
    const pad = Math.max(span * 0.04, 30 * MS_PER_DAY)
    minStart -= pad
    maxEnd += pad

    const rStart = new Date(minStart)
    const rEnd = new Date(maxEnd)

    const rows = withStartDate
      .slice()
      .sort((a, b) => new Date(a.contractDate as string).getTime() - new Date(b.contractDate as string).getTime())
      .map((p) => {
        const start = new Date(p.contractDate as string).getTime()
        const isOpenEnded = !p.renewalDate
        const end = p.renewalDate ? new Date(p.renewalDate).getTime() : maxEnd
        const startPct = ((start - minStart) / (maxEnd - minStart)) * 100
        const endPct = ((end - minStart) / (maxEnd - minStart)) * 100
        return { policy: p, startPct, endPct: Math.max(endPct, startPct + 1.5), isOpenEnded }
      })

    const startYear = rStart.getFullYear()
    const endYear = rEnd.getFullYear()
    const totalYears = Math.max(endYear - startYear, 1)
    const step = Math.max(1, Math.ceil(totalYears / 6))
    const ticks: number[] = []
    for (let y = Math.ceil(startYear / step) * step; y <= endYear; y += step) {
      ticks.push(y)
    }

    return { rangeStart: rStart, rangeEnd: rEnd, rows, yearTicks: ticks }
  }, [withStartDate, today])

  const todayPct = useMemo(() => {
    const span = rangeEnd.getTime() - rangeStart.getTime()
    if (span <= 0) return 0
    return ((today.getTime() - rangeStart.getTime()) / span) * 100
  }, [rangeStart, rangeEnd, today])

  const yearPct = (year: number) => {
    const t = new Date(year, 0, 1).getTime()
    const span = rangeEnd.getTime() - rangeStart.getTime()
    if (span <= 0) return 0
    return ((t - rangeStart.getTime()) / span) * 100
  }

  if (withStartDate.length === 0) return null

  return (
    <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h3 className="text-sm font-bold text-ink">保険期間タイムライン</h3>
      <p className="mt-0.5 text-xs text-ink-muted">それぞれの保険がいつまで保障されるかを表しています。</p>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="relative h-5 border-b border-line text-[11px] text-ink-muted">
            {yearTicks.map((y) => (
              <span
                key={y}
                className="absolute -translate-x-1/2 tabular-nums"
                style={{ left: `${yearPct(y)}%` }}
              >
                {y}
              </span>
            ))}
          </div>

          <div className="relative mt-2 space-y-3">
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-brand-500"
              style={{ left: `${todayPct}%` }}
            >
              <span className="absolute -top-1 left-1.5 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-white">
                今日 {formatDate(today.toISOString())}
              </span>
            </div>

            {rows.map(({ policy, startPct, endPct, isOpenEnded }) => {
              const meta = getCategory(policy.category)
              return (
                <div key={policy.id} className="flex items-center gap-3">
                  <div className="hidden w-40 shrink-0 truncate text-xs text-ink-secondary sm:block">
                    <span className="font-semibold text-ink">{policy.insuredPersonName}</span>
                    <span className="mx-1">·</span>
                    {meta.shortLabel}
                  </div>
                  <div className="relative h-6 flex-1 rounded-full bg-plane">
                    <div
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        left: `${startPct}%`,
                        width: `${endPct - startPct}%`,
                        backgroundColor: meta.color,
                        backgroundImage: isOpenEnded
                          ? `linear-gradient(to right, ${meta.color}, ${meta.color} 80%, ${meta.color}55)`
                          : undefined,
                      }}
                      title={`${meta.label}: ${formatDate(policy.contractDate)} 〜 ${
                        isOpenEnded ? '終身' : formatDate(policy.renewalDate)
                      }`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full bg-brand-500" />
          今日
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-4 rounded-full"
            style={{ backgroundImage: 'linear-gradient(to right, #85837c, #85837c 80%, #85837c55)' }}
          />
          終身・保障継続中
        </span>
      </div>
    </div>
  )
}
