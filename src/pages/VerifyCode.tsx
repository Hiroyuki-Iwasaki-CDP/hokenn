import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, KeyRound } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { maskEmail } from '../lib/format'
import { useAuth } from '../store/AuthContext'
import type { AuthUser } from '../types/insurance'

const RESEND_COOLDOWN_SECONDS = 60

interface VerifyResponse {
  ok: true
  needsOnboarding: boolean
  user: AuthUser
}

export default function VerifyCode() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const email = (location.state as { email?: string } | null)?.email ?? ''

  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)

  useEffect(() => {
    if (!email) navigate('/login', { replace: true })
  }, [email, navigate])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => Math.max(c - 1, 0)), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting || code.length !== 6) return
    setError(null)
    setSubmitting(true)
    try {
      const data = await api.post<VerifyResponse>('/api/auth/verify-code', { email, code })
      setUser(data.user, data.needsOnboarding)
      navigate(data.needsOnboarding ? '/onboarding' : '/', { replace: true })
    } catch (err) {
      setCode('')
      setError(err instanceof ApiError ? err.message : 'エラーが発生しました。しばらくしてから再度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (resending || cooldown > 0) return
    setError(null)
    setResending(true)
    try {
      await api.post('/api/auth/request-code', { email })
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'エラーが発生しました。しばらくしてから再度お試しください。')
    } finally {
      setResending(false)
    }
  }

  if (!email) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-800">
            <ShieldCheck size={24} strokeWidth={2.25} />
          </span>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-lg font-bold text-white">わが家の保険</h1>
            </div>
            <p className="mt-1 text-sm text-brand-100">認証コードを入力してください</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-ink-secondary">
            <span className="font-semibold text-ink">{maskEmail(email)}</span> 宛に6桁の認証コードを送信しました。
          </p>
          <p className="mt-1 text-xs text-ink-muted">メールに記載の有効期限内に入力してください。</p>

          <label className="mt-4 mb-1.5 block text-sm font-semibold text-ink" htmlFor="code">
            認証コード(6桁)
          </label>
          <div className="relative">
            <KeyRound size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-xl border border-line bg-plane py-2.5 pr-3 pl-9 text-center text-lg font-bold tracking-[0.4em] text-ink placeholder:tracking-normal placeholder:font-normal placeholder:text-ink-muted focus:border-brand-400 focus:bg-white focus:outline-none"
            />
          </div>

          {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '確認しています…' : 'ログインする'}
          </button>

          <div className="mt-4 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-semibold text-ink-secondary hover:text-ink"
            >
              メールアドレスを変更
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="font-semibold text-brand-700 hover:text-brand-800 disabled:cursor-not-allowed disabled:text-ink-muted"
            >
              {cooldown > 0 ? `再送信 (${cooldown}秒後)` : resending ? '再送信しています…' : 'コードを再送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
