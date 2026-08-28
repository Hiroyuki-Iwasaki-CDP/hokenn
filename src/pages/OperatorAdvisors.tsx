import { useEffect, useState, type FormEvent } from 'react'
import { ShieldCheck, UserPlus, Users } from 'lucide-react'
import { api, ApiError } from '../lib/api'

interface ManagedAdvisor {
  id: string
  email: string
  displayName: string | null
  agencyName: string | null
  isOperator: boolean
  isActive: boolean
  onboarded: boolean
  clientCount: number
  createdAt: string
}

export default function OperatorAdvisors() {
  const [advisors, setAdvisors] = useState<ManagedAdvisor[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    api.get<{ advisors: ManagedAdvisor[] }>('/api/operator/advisors')
      .then((data) => setAdvisors(data.advisors))
      .catch((err) => setError(err instanceof ApiError ? err.message : '担当者一覧を読み込めませんでした。'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const invite = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || saving) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api.post('/api/operator/advisors', { email: email.trim() })
      setEmail('')
      setMessage('担当者用の招待メールを送信しました。')
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '担当者を招待できませんでした。')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (advisor: ManagedAdvisor) => {
    if (statusSavingId || advisor.isOperator) return
    const nextActive = !advisor.isActive
    const action = nextActive ? '利用を再開' : '利用を停止'
    if (!window.confirm(`${advisor.displayName ?? advisor.email}の${action}を実行しますか？`)) return
    setStatusSavingId(advisor.id)
    setMessage(null)
    setError(null)
    try {
      await api.patch('/api/operator/advisors', { id: advisor.id, active: nextActive })
      setAdvisors((current) => current.map((item) => item.id === advisor.id ? { ...item, isActive: nextActive } : item))
      setMessage(`${action}しました。`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `${action}できませんでした。`)
    } finally {
      setStatusSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Operator</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">担当者アカウント管理</h1>
        <p className="mt-1 text-sm text-ink-secondary">運営者だけが担当FPの招待・利用停止・再開を行えます。</p>
      </div>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><UserPlus size={16} />担当者を招待する</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">契約者として登録済みのメールアドレスは担当者へ変更できません。</p>
        <form onSubmit={invite} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="advisor@example.com" className="min-w-0 flex-1 rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink focus:border-brand-400 focus:bg-white focus:outline-none" />
          <button type="submit" disabled={saving || !email.trim()} className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-50">{saving ? '招待中…' : '招待メールを送る'}</button>
        </form>
        {message && <p className="mt-3 text-xs font-semibold text-brand-700">{message}</p>}
        {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><Users size={16} />担当者一覧</h2>
          {!loading && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-800">{advisors.length}人</span>}
        </div>
        {loading ? <p className="text-sm text-ink-muted">読み込み中…</p> : (
          <ul className="divide-y divide-line">
            {advisors.map((advisor) => (
              <li key={advisor.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink">{advisor.displayName ?? advisor.email}</p>
                    {advisor.isOperator && <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-800"><ShieldCheck size={11} />運営者</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${advisor.isActive ? 'bg-[#e9f9ef] text-[#058a3e]' : 'bg-red-50 text-red-700'}`}>{advisor.isActive ? '利用中' : '利用停止'}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-muted">{advisor.email}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">{advisor.agencyName ?? '所属代理店未設定'}・顧客 {advisor.clientCount}人・{advisor.onboarded ? '初期設定済み' : '招待済み・未設定'}</p>
                </div>
                <button type="button" disabled={advisor.isOperator || statusSavingId !== null} onClick={() => void changeStatus(advisor)} className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${advisor.isActive ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-brand-200 text-brand-800 hover:bg-brand-50'}`}>
                  {statusSavingId === advisor.id ? '変更中…' : advisor.isOperator ? '運営者は停止不可' : advisor.isActive ? '利用を停止' : '利用を再開'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
