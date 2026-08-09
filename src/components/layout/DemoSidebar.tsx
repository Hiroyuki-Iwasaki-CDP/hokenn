import { Link } from 'react-router-dom'
import { LayoutGrid, ListChecks, Scale, ShieldCheck, LogIn } from 'lucide-react'
import BetaBadge from '../common/BetaBadge'

const NAV_ITEMS = [
  { label: 'ホーム', icon: LayoutGrid },
  { label: '保険一覧', icon: ListChecks },
  { label: '保障を比べる', icon: Scale },
]

// ログイン不要の見た目だけのデモ用サイドバー。実データ・実APIには一切触れない。
export default function DemoSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-brand-900 px-4 py-6 text-brand-50 md:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
          <ShieldCheck size={18} strokeWidth={2.25} />
        </span>
        <span className="text-[15px] font-bold text-white">わが家の保険</span>
        <BetaBadge />
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ label, icon: Icon }, i) => (
          <span
            key={label}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
              i === 0 ? 'bg-brand-50 text-brand-900' : 'text-brand-100'
            }`}
          >
            <Icon size={18} strokeWidth={2.25} />
            {label}
          </span>
        ))}
      </nav>

      <div className="mt-4 rounded-xl bg-white/5 px-3 py-3">
        <p className="mb-2 text-[10px] font-bold tracking-wide text-brand-200 uppercase">保険の担当者</p>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-800">
            蛭
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">蛭田 拓也さん</p>
            <p className="truncate text-[11px] text-brand-100">あんしん生命 代理店</p>
          </div>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-brand-100">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-300" />
          相談受付中
        </p>
      </div>

      <div className="mt-auto space-y-2 pt-6">
        <p className="rounded-xl bg-white/5 px-3 py-2.5 text-[11px] leading-relaxed text-brand-100">
          これはサンプルデータによるデモ画面です。実際に保険を登録・管理するにはログインが必要です。
        </p>
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-brand-800 shadow-sm transition-colors hover:bg-brand-50"
        >
          <LogIn size={16} strokeWidth={2.5} />
          ログインして使ってみる
        </Link>
      </div>
    </aside>
  )
}
