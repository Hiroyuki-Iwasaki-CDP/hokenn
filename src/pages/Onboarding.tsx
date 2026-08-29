import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../store/AuthContext'
import SensitiveInfoNotice from '../components/common/SensitiveInfoNotice'
import type { AuthUser, ManageScope } from '../types/insurance'

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, setUser } = useAuth()
  const isAdvisor = user?.role === 'advisor'
  const isReturningUser = !!user?.displayName

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [manageScope, setManageScope] = useState<ManageScope>(user?.manageScope ?? 'self')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [sensitiveAck, setSensitiveAck] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = displayName.trim() !== '' && termsAccepted && sensitiveAck

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const data = await api.put<{ user: AuthUser }>('/api/profile', {
        displayName: displayName.trim(),
        manageScope: isAdvisor ? undefined : manageScope,
        termsAccepted: true,
        sensitiveInfoAcknowledged: true,
      })
      setUser(data.user)
      navigate(isAdvisor ? '/advisor' : '/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'エラーが発生しました。しばらくしてから再度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-plane px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
            <ShieldCheck size={18} strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-lg font-bold text-ink">{isReturningUser ? '利用条件の確認をお願いします。' : 'はじめまして。初期設定をお願いします。'}</h1>
            {isReturningUser && <p className="mt-1 text-xs text-ink-muted">家族連携機能の追加に伴い、利用規約とプライバシーポリシーを更新しました。</p>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-line bg-white p-6">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="displayName">
              表示名
            </label>
            <input
              id="displayName"
              type="text"
              required
              maxLength={100}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例: 佐藤 健太"
              className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand-400 focus:bg-white focus:outline-none"
            />
          </div>

          {!isAdvisor && (
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">管理したい対象</p>
              <div className="grid grid-cols-2 gap-2">
                {(['self', 'family'] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setManageScope(scope)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      manageScope === scope
                        ? 'border-brand-500 bg-brand-50 text-brand-800'
                        : 'border-line text-ink-secondary hover:bg-plane'
                    }`}
                  >
                    {scope === 'self' ? '自分のみ' : '家族も含める'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <SensitiveInfoNotice />

          <label className="flex items-start gap-2.5 text-xs text-ink-secondary">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-400"
            />
            <span>
              <a className="font-semibold text-brand-700 hover:underline" href="/terms" target="_blank" rel="noreferrer">
                利用規約
              </a>
              ・
              <a className="font-semibold text-brand-700 hover:underline" href="/privacy" target="_blank" rel="noreferrer">
                プライバシーポリシー
              </a>
              に同意します。
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-xs text-ink-secondary">
            <input
              type="checkbox"
              checked={sensitiveAck}
              onChange={(e) => setSensitiveAck(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-400"
            />
            保険証券画像・病歴・口座情報などの機密情報を登録しないことを理解しました。
          </label>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '保存しています…' : isReturningUser ? '同意して続ける' : 'はじめる'}
          </button>
        </form>
      </div>
    </div>
  )
}
