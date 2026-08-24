import { Link, Navigate } from 'react-router-dom'
import { AlertTriangle, Mail, MessageCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../store/AuthContext'

const OFFICIAL_LINE_URL = 'https://line.me/R/ti/p/@615aecnm'

const LINE_ERROR_MESSAGES: Record<string, string> = {
  invalid_request: 'LINEから戻った情報を確認できませんでした。もう一度お試しください。',
  token_exchange_failed: 'LINEの本人確認を完了できませんでした。もう一度お試しください。',
  missing_id_token: 'LINEの本人確認情報を取得できませんでした。',
  verification_failed: 'LINEの本人確認情報を検証できませんでした。',
  invalid_user: 'LINEユーザーを確認できませんでした。',
  not_linked: 'このLINEアカウントはまだ連携されていません。最初にメール認証でログインし、設定画面からLINE連携を行ってください。',
  session_failed: 'ログイン状態を作成できませんでした。メール認証でログインしてください。',
}

export default function LineEntry() {
  const { status, user, needsOnboarding } = useAuth()
  const search = new URLSearchParams(window.location.search)
  const lineError = search.get('line') === 'error'
    ? LINE_ERROR_MESSAGES[search.get('reason') ?? ''] ?? 'LINEでログインできませんでした。'
    : null
  const nextPath = search.get('next') === 'consultation' ? '/consultation' : '/'

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
    return <Navigate to={user?.role === 'advisor' ? '/advisor' : nextPath} replace />
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
          LINE連携済みの方は、LINE本人確認だけで安全に保険情報を表示できます。
        </p>

        {lineError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>{lineError}</p>
          </div>
        )}

        <a
          href={`/api/auth/line/start?flow=login${nextPath === '/consultation' ? '&next=consultation' : ''}`}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] px-4 py-3 text-sm font-bold text-white hover:bg-[#05b64d]"
        >
          <MessageCircle size={18} />
          LINEでログイン
        </a>

        <div className="my-4 flex items-center gap-3 text-[11px] text-ink-muted">
          <span className="h-px flex-1 bg-line" />
          <span>LINE未連携の方</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <Link
          to="/login?source=line"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-700 px-4 py-3 text-sm font-bold text-brand-800 hover:bg-brand-50"
        >
          <Mail size={17} />
          メール認証で初回ログイン
        </Link>

        <p className="mt-4 rounded-xl bg-plane px-4 py-3 text-xs leading-relaxed text-ink-muted">
          初回は招待されたメールアドレスでログインし、設定画面からLINE連携を行ってください。
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
