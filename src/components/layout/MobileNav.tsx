import { NavLink } from 'react-router-dom'
import { LayoutGrid, ListChecks, Scale, Plus } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'ホーム', icon: LayoutGrid, end: true },
  { to: '/policies', label: '一覧', icon: ListChecks, end: false },
  { to: '/policies/new', label: '登録', icon: Plus, end: false },
  { to: '/compare', label: '比べる', icon: Scale, end: false },
]

export default function MobileNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="モバイルナビゲーション"
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              isActive ? 'text-brand-700' : 'text-ink-muted'
            }`
          }
        >
          <Icon size={20} strokeWidth={2.25} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
