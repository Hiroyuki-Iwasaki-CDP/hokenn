import type { ReactNode } from 'react'
import { Users } from 'lucide-react'
import { ALL_FAMILY_ID } from '../../lib/familyFilter'

export default function FamilyTabs({
  persons,
  value,
  onChange,
}: {
  persons: string[]
  value: string
  onChange: (id: string) => void
}) {
  if (persons.length <= 1) return null

  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl bg-stone-100 p-1.5" role="tablist" aria-label="対象者の切り替え">
      <TabButton active={value === ALL_FAMILY_ID} onClick={() => onChange(ALL_FAMILY_ID)} icon={<Users size={15} />}>
        すべて
      </TabButton>
      {persons.map((name) => (
        <TabButton key={name} active={value === name} onClick={() => onChange(name)}>
          {name}
        </TabButton>
      ))}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-secondary hover:text-ink'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
