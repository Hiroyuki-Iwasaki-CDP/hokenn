import type { ReactNode } from 'react'

export default function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-ink sm:text-lg">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-ink-secondary">{children}</div>
    </section>
  )
}
