import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Mail } from 'lucide-react'
import { api, ApiError } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await api.post('/api/auth/request-code', { email })
      navigate('/login/verify', { state: { email } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'エラーが発生しました。しばらくしてから再度お試しください。')
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
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-lg font-bold text-white">わが家の保険</h1>
            </div>
            <p className="mt-1 text-sm text-brand-100">いまの保険を、ひと目で。</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm">
          <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="email">
            メールアドレス
          </label>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-line bg-plane py-2.5 pr-3 pl-9 text-sm text-ink placeholder:text-ink-muted focus:border-brand-400 focus:bg-white focus:outline-none"
            />
          </div>

          {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !email}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '送信しています…' : '認証コードを送る'}
          </button>

          <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
            このアプリは招待された方のみご利用いただけます。
            <br />
            入力いただいた情報は本人確認以外の目的には使用しません。
          </p>
          <p className="mt-3 flex justify-center gap-4 text-xs">
            <a className="font-semibold text-brand-700 hover:underline" href="/privacy" target="_blank" rel="noreferrer">
              プライバシーポリシー
            </a>
            <a className="font-semibold text-brand-700 hover:underline" href="/terms" target="_blank" rel="noreferrer">
              利用規約
            </a>
          </p>
        </form>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-brand-100">
          安全のため、保険証券画像・病歴・口座情報などの機密情報は登録しないでください。
        </p>
      </div>
    </div>
  )
}
