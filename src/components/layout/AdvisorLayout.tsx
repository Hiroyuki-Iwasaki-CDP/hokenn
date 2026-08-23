import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import PrivacyFooter from './PrivacyFooter'

export default function AdvisorLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-plane">
      <aside className="hidden w-60 shrink-0 flex-col bg-brand-900 px-4 py-6 text-brand-50 md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
            <ShieldCheck size={18} strokeWidth={2.25} />
          </span>
          <span className="text-[15px] font-bold text-white">わが家の保険</span>
        </div>

        <p className="mb-4 rounded-xl bg-white/5 px-3 py-2.5 text-[11px] leading-relaxed text-brand-100">
          担当者用画面です。{user?.displayName ?? ''}さんとしてログイン中。
        </p>

        <nav className="flex flex-col gap-1">
          <NavLink
            to="/advisor"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive ? 'bg-brand-50 text-brand-900' : 'text-brand-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Users size={18} strokeWidth={2.25} />
            顧客一覧・自分のプロフィール
          </NavLink>
        </nav>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-100 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={15} />
            ログアウト
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-line bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-700 text-white">
              <ShieldCheck size={16} strokeWidth={2.25} />
            </span>
            <span className="text-sm font-bold text-ink">わが家の保険(担当者用)</span>
          </div>
          <button type="button" onClick={handleLogout} className="text-xs font-semibold text-ink-secondary">
            ログアウト
          </button>
        </header>
        <main className="flex-1 px-4 pt-6 pb-10 sm:px-6 md:px-10 md:pt-8">
          <div className="mx-auto max-w-3xl">
            <Outlet />
            <PrivacyFooter />
          </div>
        </main>
      </div>
    </div>
  )
}
