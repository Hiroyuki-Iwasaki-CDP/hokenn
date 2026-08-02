import type { ReactNode } from 'react'

export default function DetailSection({
  title,
  icon,
  children,
  note,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  note?: string
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        {icon && <span className="text-brand-600">{icon}</span>}
        <h2 className="text-sm font-bold text-ink">{title}</h2>
      </div>
      {children}
      {note && <p className="mt-4 rounded-xl bg-plane px-3.5 py-2.5 text-xs text-ink-secondary">{note}</p>}
    </section>
  )
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{children}</div>
}

export function Field({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold text-ink tabular-nums">
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium text-ink-secondary">{unit}</span>}
      </p>
    </div>
  )
}
