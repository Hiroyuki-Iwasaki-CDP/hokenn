import type { ReactNode } from 'react'

type Tone = 'good' | 'muted' | 'warning' | 'brand'

const TONE_CLASSES: Record<Tone, string> = {
  good: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
  muted: 'bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  brand: 'bg-brand-600 text-white',
}

export default function Badge({
  children,
  tone = 'muted',
  icon,
}: {
  children: ReactNode
  tone?: Tone
  icon?: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {icon}
      {children}
    </span>
  )
}
