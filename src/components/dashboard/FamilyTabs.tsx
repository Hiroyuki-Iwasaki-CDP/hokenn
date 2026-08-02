import type { ReactNode } from 'react'
import { Users } from 'lucide-react'
import type { FamilyMember } from '../../types/insurance'
import { ALL_FAMILY_ID, selectableFamilyTabs } from '../../lib/familyFilter'
import { RELATION_LABEL } from '../../lib/status'

export default function FamilyTabs({
  family,
  value,
  onChange,
}: {
  family: FamilyMember[]
  value: string
  onChange: (id: string) => void
}) {
  const members = selectableFamilyTabs(family)

  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl bg-stone-100 p-1.5" role="tablist" aria-label="家族の切り替え">
      <TabButton active={value === ALL_FAMILY_ID} onClick={() => onChange(ALL_FAMILY_ID)} icon={<Users size={15} />}>
        家族全員
      </TabButton>
      {members.map((m) => (
        <TabButton key={m.id} active={value === m.id} onClick={() => onChange(m.id)}>
          {RELATION_LABEL[m.relation]}
          <span className="ml-1 hidden font-normal text-ink-muted sm:inline">({m.name})</span>
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
