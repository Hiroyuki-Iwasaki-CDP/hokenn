import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, MailPlus, ShieldCheck, Trash2, UserRound, Users } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { getCategory } from '../lib/categories'
import { toMonthlyPremium } from '../lib/calculations'
import { formatDate, formatMoneyWithYen, formatYen } from '../lib/format'
import { useExchangeRate } from '../store/ExchangeRateContext'
import { PREMIUM_FREQUENCY_LABEL } from '../lib/status'
import type { FamilyConnection, FamilySharedPolicy, PendingFamilyInvitation } from '../types/insurance'

interface FamilyState {
  connections: FamilyConnection[]
  pendingInvitations: PendingFamilyInvitation[]
}

interface PoliciesResponse {
  member: { id: string; displayName: string | null }
  policies: FamilySharedPolicy[]
}

export default function Family() {
  const { usdJpy } = useExchangeRate()
  const [state, setState] = useState<FamilyState>({ connections: [], pendingInvitations: [] })
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [policies, setPolicies] = useState<FamilySharedPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [policiesLoading, setPoliciesLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadState = async () => {
    const data = await api.get<FamilyState>('/api/family')
    setState(data)
    setSelectedMemberId((current) => current && data.connections.some((item) => item.memberId === current)
      ? current
      : data.connections[0]?.memberId ?? null)
  }

  useEffect(() => {
    loadState().catch((err) => setError(err instanceof ApiError ? err.message : '家族連携を読み込めませんでした。')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedMemberId) {
      setPolicies([])
      return
    }
    let active = true
    setPoliciesLoading(true)
    api.get<PoliciesResponse>(`/api/family/policies?memberId=${encodeURIComponent(selectedMemberId)}`)
      .then((data) => { if (active) setPolicies(data.policies) })
      .catch((err) => { if (active) setError(err instanceof ApiError ? err.message : '家族の保険情報を読み込めませんでした。') })
      .finally(() => { if (active) setPoliciesLoading(false) })
    return () => { active = false }
  }, [selectedMemberId])

  const monthlyTotal = useMemo(() => policies.reduce((sum, policy) => {
    const monthly = toMonthlyPremium(policy)
    return sum + monthly * (policy.currency === 'USD' ? (usdJpy ?? 0) : 1)
  }, 0), [policies, usdJpy])

  const invite = async (event: FormEvent) => {
    event.preventDefault()
    if (!confirmed || saving) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api.post('/api/family', { email: email.trim() })
      setEmail('')
      setConfirmed(false)
      setMessage('家族招待メールを送りました。招待先の方が承認すると連携が始まります。')
      await loadState()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '家族招待を送信できませんでした。')
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (action: 'invitation' | 'connection', id: string) => {
    if (saving) return
    if (action === 'connection' && !window.confirm('家族連携を解除しますか？お互いの保険概要が見られなくなります。')) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api.del('/api/family', { action, id })
      setMessage(action === 'connection' ? '家族連携を解除しました。' : '家族招待を取り消しました。')
      await loadState()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '操作を完了できませんでした。')
    } finally {
      setSaving(false)
    }
  }

  const selected = state.connections.find((item) => item.memberId === selectedMemberId)

  return (
    <div className="space-y-6">
      <div><p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Family</p><h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">家族連携</h1><p className="mt-1 text-sm text-ink-secondary">家族同士で保険概要を安全に確認できます。</p></div>

      <section className="rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:p-6">
        <div className="flex items-start gap-3"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand-700" /><div><h2 className="text-sm font-bold text-brand-900">共有範囲を限定しています</h2><p className="mt-1 text-xs leading-relaxed text-brand-800">家族が確認できるのは、保険会社・商品名・保険料・保障額・契約期間などの概要だけです。証券番号・受取人・メモ・連絡先・添付情報は共有されず、編集や削除もできません。担当代理店やLINEへの共有設定にも影響しません。</p></div></div>
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><MailPlus size={17} />家族を招待</h2>
        <form onSubmit={invite} className="space-y-3">
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">家族のメールアドレス</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="family@example.com" className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand-400 focus:bg-white focus:outline-none" /></label>
          <label className="flex items-start gap-2.5 rounded-xl bg-plane px-4 py-3 text-xs leading-relaxed text-ink-secondary"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line text-brand-700" /><span>相手が承認すると、お互いの現在および今後登録する保険概要を読み取り専用で確認できることに同意します。</span></label>
          <button type="submit" disabled={saving || !confirmed || email.trim() === ''} className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">{saving ? '送信しています…' : '家族招待を送る'}</button>
        </form>
        {message && <p className="text-xs font-semibold text-brand-700">{message}</p>}
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        {state.pendingInvitations.length > 0 && <div><p className="mb-2 text-xs font-bold text-ink-secondary">承認待ち</p><ul className="divide-y divide-line rounded-xl border border-line px-4">{state.pendingInvitations.map((invitation) => <li key={invitation.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{invitation.email}</p><p className="mt-0.5 text-[11px] text-ink-muted">有効期限 {new Date(invitation.expiresAt).toLocaleDateString('ja-JP')}</p></div><button type="button" onClick={() => void revoke('invitation', invitation.id)} disabled={saving} className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink-secondary hover:bg-plane disabled:opacity-50">取り消す</button></li>)}</ul></div>}
      </section>

      <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><Users size={17} />連携中の家族</h2>
        {loading ? <p className="text-sm text-ink-muted">読み込んでいます…</p> : state.connections.length === 0 ? <p className="rounded-xl bg-plane px-4 py-3 text-sm text-ink-muted">まだ連携中の家族はいません。</p> : <div className="grid gap-3 sm:grid-cols-2">{state.connections.map((connection) => <button key={connection.id} type="button" onClick={() => setSelectedMemberId(connection.memberId)} className={`flex items-center gap-3 rounded-xl border p-4 text-left ${selectedMemberId === connection.memberId ? 'border-brand-400 bg-brand-50' : 'border-line hover:bg-plane'}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700"><UserRound size={19} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-ink">{connection.displayName || connection.email}</strong><span className="block truncate text-xs text-ink-muted">{connection.email}</span></span></button>)}</div>}
      </section>

      {selected && <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-bold text-ink">{selected.displayName || selected.email}さんの保険概要</h2><p className="mt-1 text-xs text-ink-muted">月額換算合計 {policiesLoading ? '確認中…' : formatYen(monthlyTotal)}・{policies.length}件</p></div><button type="button" onClick={() => void revoke('connection', selected.id)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 size={13} />連携解除</button></div>
        {policiesLoading ? <p className="text-sm text-ink-muted">保険情報を読み込んでいます…</p> : policies.length === 0 ? <p className="rounded-xl bg-plane px-4 py-3 text-sm text-ink-muted">登録されている保険はありません。</p> : <div className="grid gap-3 lg:grid-cols-2">{policies.map((policy) => {
          const category = getCategory(policy.category)
          const Icon = category.icon
          const endDate = policy.maturityDate || policy.renewalDate
          return <article key={policy.id} className="rounded-xl border border-line p-4"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ color: category.color, backgroundColor: `${category.color}16` }}><Icon size={17} /></span><div className="min-w-0"><p className="break-words text-sm font-bold text-ink">{policy.productName}</p><p className="mt-0.5 text-xs text-ink-muted">{policy.insuranceCompany}・{category.label}</p><p className="mt-0.5 text-xs text-ink-secondary">対象: {policy.insuredPersonName}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-plane px-3 py-3 text-xs"><div><p className="text-ink-muted">保険料</p><p className="mt-1 font-bold text-ink">{formatMoneyWithYen(policy.premiumAmount, policy.currency, usdJpy)} / {PREMIUM_FREQUENCY_LABEL[policy.premiumFrequency]}</p></div><div><p className="text-ink-muted">保障期間</p><p className="mt-1 flex items-center gap-1 font-bold text-ink"><CalendarDays size={12} />{endDate ? formatDate(endDate) : '終身・期限なし'}</p></div></div></article>
        })}</div>}
      </section>}
    </div>
  )
}
