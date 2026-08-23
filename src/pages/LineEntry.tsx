import { Link, Navigate } from 'react-router-dom'
import { Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../store/AuthContext'

const OFFICIAL_LINE_URL = 'https://line.me/R/ti/p/@615aecnm'

export default function LineEntry() {
  const { status, user, needsOnboarding } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-900">
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-white text-brand-800">
          <ShieldCheck size={24} strokeWidth={2.25} />
        </span>
      </div>
    )
  }

  if (status === 'authenticated') {
    if (needsOnboarding) return <Navigate to="/onboarding" replace />
    return <Navigate to={user?.role === 'advisor' ? '/advisor' : '/'} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 px-4 py-10">
      <main className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm sm:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-800">
          <ShieldCheck size={24} strokeWidth={2.25} />
        </div>

        <p className="mt-5 text-xs font-bold tracking-wide text-brand-700">公式LINEから開いています</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">保険内容を確認</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          ご本人の保険情報を安全に表示するため、登録済みのメールアドレスで本人確認してください。
          LINE連携済みでも、ログイン期限が切れた場合は再認証が必要です。
        </p>

        <Link
          to="/login?source=line"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white hover:bg-brand-800"
        >
          <Mail size={17} />
          メール認証でログイン
        </Link>

        <p className="mt-4 rounded-xl bg-plane px-4 py-3 text-xs leading-relaxed text-ink-muted">
          このアプリは招待制です。担当代理店から案内されたメールアドレスをご利用ください。
        </p>

        <a
          href={OFFICIAL_LINE_URL}
          className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-[#06A84F] hover:underline"
        >
          <MessageCircle size={17} />
          担当者へ相談する
        </a>
      </main>
    </div>
  )
}
