import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Users } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../store/AuthContext'

interface Preview {
  valid: true
  inviterName: string | null
}

export default function FamilyInviteConfirm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = searchParams.get('token') ?? ''
  const tokenLooksValid = useMemo(() => /^[A-Za-z0-9_-]{43}$/.test(token), [token])

  useEffect(() => {
    if (!tokenLooksValid) {
      setLoading(false)
      return
    }
    let active = true
    api.get<Preview>(`/api/auth/accept-family-invitation?token=${encodeURIComponent(token)}`)
      .then((data) => { if (active) setPreview(data) })
      .catch((err) => { if (active) setError(err instanceof ApiError ? err.message : '家族招待を確認できませんでした。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token, tokenLooksValid])

  const accept = async () => {
    if (!tokenLooksValid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const data = await api.post<{ ok: true; next: '/onboarding' | '/family' }>('/api/auth/accept-family-invitation', { token })
      await refresh()
      navigate(data.next, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '家族連携を開始できませんでした。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-800"><ShieldCheck size={24} /></span>
          <div><h1 className="text-lg font-bold text-white">わが家の保険</h1><p className="mt-1 text-sm text-brand-100">家族連携の招待</p></div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Users size={24} /></span>
          <h2 className="mt-4 text-center text-base font-bold text-ink">
            {loading ? '招待内容を確認しています' : preview ? `${preview.inviterName || 'ご家族'}さんから招待されました` : '招待を確認できません'}
          </h2>
          <div className="mt-4 space-y-2 rounded-xl bg-plane px-4 py-3 text-xs leading-relaxed text-ink-secondary">
            <p className="font-bold text-ink">承認すると、お互いに確認できます</p>
            <p>保険会社・商品名・保険料・保障額・契約期間などの概要を、読み取り専用で確認できます。</p>
            <p>編集・削除はできません。証券番号・受取人・メモ・連絡先・添付情報は共有されません。</p>
            <p>家族連携は、どちらからでもいつでも解除できます。</p>
          </div>
          {!tokenLooksValid && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">家族招待リンクが正しくありません。</p>}
          {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold leading-relaxed text-red-700">{error}</p>}
          <button type="button" onClick={() => void accept()} disabled={!tokenLooksValid || loading || !preview || submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? '承認しています…' : '内容を確認して家族連携を始める'}{!submitting && <ArrowRight size={16} />}
          </button>
          <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">心当たりがない場合は、承認せずにこの画面を閉じてください。</p>
        </div>
      </div>
    </div>
  )
}
