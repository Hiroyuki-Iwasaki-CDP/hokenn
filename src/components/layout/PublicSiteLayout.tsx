import { Link, NavLink, Outlet } from 'react-router-dom'
import { BookOpen, LogIn, ShieldCheck } from 'lucide-react'
import { SERVICE_NAME, SUPPORT_EMAIL } from '../../config/service'

const navItems = [
  { to: '/about', label: 'サービス紹介' },
  { to: '/manual', label: '使い方' },
  { to: '/demo', label: 'デモ' },
]

export default function PublicSiteLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/about" className="flex shrink-0 items-center gap-2 text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
              <ShieldCheck size={18} strokeWidth={2.25} />
            </span>
            <span className="text-sm font-bold sm:text-base">{SERVICE_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="公開ページ">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-secondary hover:bg-plane hover:text-ink'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Link to="/login" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-800 sm:text-sm">
            <LogIn size={15} />ログイン
          </Link>
        </div>
        <nav className="flex border-t border-line px-2 sm:hidden" aria-label="モバイル公開ページ">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex-1 py-2 text-center text-xs font-semibold ${isActive ? 'text-brand-700' : 'text-ink-muted'}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main><Outlet /></main>

      <footer className="border-t border-line bg-brand-900 text-brand-100">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:px-6">
          <div>
            <div className="flex items-center gap-2 text-white"><ShieldCheck size={18} /><span className="font-bold">{SERVICE_NAME}</span></div>
            <p className="mt-3 max-w-xl text-xs leading-relaxed">保険契約を整理・確認し、本人が選んだ家族や担当代理店とつながるための招待制サービスです。保険募集、契約判断、法律・税務・医療上の助言は行いません。</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs font-semibold sm:text-right">
            <Link to="/manual" className="hover:text-white"><BookOpen size={13} className="mr-1 inline" />使い方</Link>
            <Link to="/demo" className="hover:text-white">デモ</Link>
            <Link to="/privacy" className="hover:text-white">プライバシー</Link>
            <Link to="/terms" className="hover:text-white">利用規約</Link>
            {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`} className="col-span-2 hover:text-white">お問い合わせ</a>}
          </div>
        </div>
      </footer>
    </div>
  )
}
