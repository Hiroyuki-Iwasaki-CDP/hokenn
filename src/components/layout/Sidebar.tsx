import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, ListChecks, Scale, ShieldCheck, Plus, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import AdvisorCard from './AdvisorCard'
import BetaBadge from '../common/BetaBadge'

const NAV_ITEMS = [
  { to: '/', label: 'ホーム', icon: LayoutGrid, end: true },
  { to: '/policies', label: '保険一覧', icon: ListChecks, end: false },
  { to: '/compare', label: '保障を比べる', icon: Scale, end: false },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-brand-900 px-4 py-6 text-brand-50 md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
          <ShieldCheck size={18} strokeWidth={2.25} />
        </span>
        <span className="text-[15px] font-bold text-white">わが家の保険</span>
        <BetaBadge />
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-900' : 'text-brand-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={18} strokeWidth={2.25} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4">
        <AdvisorCard />
      </div>

      <div className="mt-auto space-y-2 pt-6">
        <NavLink
          to="/policies/new"
          className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-brand-800 shadow-sm transition-colors hover:bg-brand-50"
        >
          <Plus size={17} strokeWidth={2.5} />
          保険を登録
        </NavLink>
        <div className="flex gap-1.5">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <SettingsIcon size={14} />
            設定
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-brand-100 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={14} />
            ログアウト
          </button>
        </div>
      </div>
    </aside>
  )
}
