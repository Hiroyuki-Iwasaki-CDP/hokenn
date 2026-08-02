import type { ReactNode } from 'react'

export default function StatCard({
  label,
  value,
  unit,
  sub,
  icon,
}: {
  label: string
  value: ReactNode
  unit?: string
  sub?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5">
      {icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</p>
        <p className="mt-1 flex items-baseline gap-1 tabular-nums">
          <span className="text-2xl font-bold text-ink sm:text-3xl">{value}</span>
          {unit && <span className="text-sm font-medium text-ink-secondary">{unit}</span>}
        </p>
        {sub && <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>}
      </div>
    </div>
  )
}
