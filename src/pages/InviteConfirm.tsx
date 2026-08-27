import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ShieldCheck, UserCheck } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../store/AuthContext'

interface AcceptInvitationResponse {
  ok: true
  next: '/onboarding' | '/settings' | '/'
  advisorChanged: boolean
}

interface InvitationPreview {
  valid: true
  invitationType: 'registration' | 'transfer'
  advisorName: string | null
  agencyName: string | null
  previousAdvisorName: string | null
  previousAgencyName: string | null
}

export default function InviteConfirm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const token = searchParams.get('token') ?? ''
  const tokenLooksValid = useMemo(() => /^[A-Za-z0-9_-]{43}$/.test(token), [token])
  const isTransfer = preview?.invitationType === 'transfer'
  const nextAdvisorLabel = preview?.advisorName || preview?.agencyName || '新しい担当FP'
  const previousAdvisorLabel = preview?.previousAdvisorName || preview?.previousAgencyName || '現在の担当FP'

  useEffect(() => {
    if (!tokenLooksValid) {
      setLoading(false)
      return
    }
    let active = true
    api.get<InvitationPreview>(`/api/auth/accept-invitation?token=${encodeURIComponent(token)}`)
      .then((data) => {
        if (active) setPreview(data)
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : '招待内容を確認できませんでした。')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [token, tokenLooksValid])

  const handleStart = async () => {
    if (!tokenLooksValid || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const data = await api.post<AcceptInvitationResponse>('/api/auth/accept-invitation', { token })
      await refresh()
      navigate(data.next, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '登録を開始できませんでした。しばらくしてからもう一度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-800">
            <ShieldCheck size={24} strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-lg font-bold text-white">わが家の保険</h1>
            <p className="mt-1 text-sm text-brand-100">保険代理店から招待されました</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <UserCheck size={24} />
          </span>
          <h2 className="mt-4 text-center text-base font-bold text-ink">
            {loading ? '招待内容を確認しています' : isTransfer ? `${nextAdvisorLabel}へ担当を変更します` : '利用開始の登録へ進みます'}
          </h2>
          {isTransfer ? (
            <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              <p className="font-bold">{previousAdvisorLabel} → {nextAdvisorLabel}</p>
              <p className="font-bold">承認後に変更される内容</p>
              <p className="mt-1">現在の担当FPへの保険共有は解除され、対応中の相談・面談予約は取り消されます。</p>
              <p className="mt-1">新しい担当FPへの保険共有は自動では始まりません。変更後に設定画面からご自身で許可できます。</p>
            </div>
          ) : (
            <p className="mt-2 text-center text-sm leading-relaxed text-ink-secondary">
              このボタンを押すと招待を確認し、名前や利用規約などの初期設定を開始します。
            </p>
          )}

          {!tokenLooksValid && (
            <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold leading-relaxed text-red-700">
              招待リンクが正しくありません。代理店へ再招待をご依頼ください。
            </p>
          )}
          {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold leading-relaxed text-red-700">{error}</p>}

          <button
            type="button"
            onClick={handleStart}
            disabled={!tokenLooksValid || loading || !preview || submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '確認しています…' : loading ? '読み込み中…' : isTransfer ? '担当FPの変更を承認する' : '登録を始める'}
            {!submitting && <ArrowRight size={16} />}
          </button>

          <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
            心当たりがない場合は、登録を始めずにこの画面を閉じてください。
          </p>
        </div>
      </div>
    </div>
  )
}
