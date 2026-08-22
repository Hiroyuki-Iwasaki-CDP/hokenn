import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, LockKeyhole, Mail, UserPlus, Users } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import BetaNotice from '../components/common/BetaNotice'
import type { AdvisorClient, AdvisorProfile } from '../types/insurance'

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand-400 focus:bg-white focus:outline-none"
      />
    </label>
  )
}

export default function AdvisorDashboard() {
  const [clients, setClients] = useState<AdvisorClient[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [advisor, setAdvisor] = useState<AdvisorProfile | null>(null)
  const [advisorLoading, setAdvisorLoading] = useState(true)
  const [advisorSaving, setAdvisorSaving] = useState(false)
  const [advisorMessage, setAdvisorMessage] = useState<string | null>(null)

  const loadClients = () => {
    setClientsLoading(true)
    api
      .get<{ clients: AdvisorClient[] }>('/api/advisor/clients')
      .then((data) => setClients(data.clients))
      .finally(() => setClientsLoading(false))
  }

  useEffect(() => {
    loadClients()
    api
      .get<{ advisor: AdvisorProfile | null }>('/api/advisor')
      .then((data) =>
        setAdvisor(
          data.advisor ?? {
            advisorName: '',
            agencyName: '',
            title: '',
            phone: '',
            email: '',
            officialLineUrl: '',
            contactHours: '',
            isAcceptingInquiries: true,
          },
        ),
      )
      .finally(() => setAdvisorLoading(false))
  }, [])

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || inviting) return
    setInviteMessage(null)
    setInviteError(null)
    setInviting(true)
    try {
      await api.post('/api/advisor/clients', { email: inviteEmail.trim() })
      setInviteMessage('招待しました。ご本人にログインページ(メールアドレス入力)からのログインをご案内ください。')
      setInviteEmail('')
      loadClients()
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : 'エラーが発生しました。')
    } finally {
      setInviting(false)
    }
  }

  const handleAdvisorSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!advisor) return
    setAdvisorMessage(null)
    setAdvisorSaving(true)
    try {
      const data = await api.put<{ advisor: AdvisorProfile }>('/api/advisor', advisor)
      setAdvisor(data.advisor)
      setAdvisorMessage('保存しました。')
    } catch (err) {
      setAdvisorMessage(err instanceof ApiError ? err.message : 'エラーが発生しました。')
    } finally {
      setAdvisorSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Advisor</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">担当者ダッシュボード</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          ご自身が招待した顧客の一覧です。契約者本人が全件共有を許可した場合だけ、保険情報を閲覧できます。
        </p>
      </div>

      <BetaNotice />

      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
          <UserPlus size={16} />
          顧客を招待する
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextInput
              label="顧客のメールアドレス"
              type="email"
              value={inviteEmail}
              onChange={setInviteEmail}
              placeholder="client@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mail size={15} />
            {inviting ? '招待しています…' : '招待する'}
          </button>
        </form>
        {inviteMessage && <p className="mt-2 text-xs font-semibold text-brand-700">{inviteMessage}</p>}
        {inviteError && <p className="mt-2 text-xs font-semibold text-red-600">{inviteError}</p>}
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
          <Users size={16} />
          顧客一覧
        </h2>
        {clientsLoading ? (
          <p className="text-sm text-ink-muted">読み込み中…</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-ink-muted">まだ顧客を招待していません。</p>
        ) : (
          <ul className="divide-y divide-line">
            {clients.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{c.displayName ?? c.email}</p>
                  <p className="truncate text-xs text-ink-muted">{c.email}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      c.onboarded ? 'bg-brand-50 text-brand-700' : 'bg-plane text-ink-secondary'
                    }`}
                  >
                    {c.onboarded ? '利用開始済み' : '招待済み・未ログイン'}
                  </span>
                  {c.policySharingEnabled ? (
                    <Link
                      to={`/advisor/clients/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-brand-700 px-3 py-2 text-xs font-bold text-white hover:bg-brand-800"
                    >
                      <Eye size={14} />
                      共有された保険を見る
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-plane px-3 py-2 text-xs font-semibold text-ink-muted">
                      <LockKeyhole size={13} />
                      保険情報は未共有
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleAdvisorSubmit} className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-sm font-bold text-ink">自分のプロフィール(顧客に表示される連絡先)</h2>
        {advisorLoading || !advisor ? (
          <p className="text-sm text-ink-muted">読み込み中…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="担当者名"
                value={advisor.advisorName ?? ''}
                onChange={(v) => setAdvisor({ ...advisor, advisorName: v })}
                placeholder="例: 蛭田 拓也"
              />
              <TextInput
                label="所属代理店"
                value={advisor.agencyName ?? ''}
                onChange={(v) => setAdvisor({ ...advisor, agencyName: v })}
                placeholder="例: あんしん生命 代理店"
              />
              <TextInput
                label="肩書き"
                value={advisor.title ?? ''}
                onChange={(v) => setAdvisor({ ...advisor, title: v })}
                placeholder="例: ファイナンシャルプランナー"
              />
              <TextInput
                label="対応可能時間"
                value={advisor.contactHours ?? ''}
                onChange={(v) => setAdvisor({ ...advisor, contactHours: v })}
                placeholder="例: 平日 9:00〜18:00"
              />
              <TextInput
                label="電話番号"
                value={advisor.phone ?? ''}
                onChange={(v) => setAdvisor({ ...advisor, phone: v })}
                placeholder="0120-000-000"
              />
              <TextInput
                label="メールアドレス"
                type="email"
                value={advisor.email ?? ''}
                onChange={(v) => setAdvisor({ ...advisor, email: v })}
                placeholder="advisor@example.com"
              />
              <TextInput
                label="公式LINE URL"
                value={advisor.officialLineUrl ?? ''}
                onChange={(v) => setAdvisor({ ...advisor, officialLineUrl: v })}
                placeholder="https://line.me/..."
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={advisor.isAcceptingInquiries}
                onChange={(e) => setAdvisor({ ...advisor, isAcceptingInquiries: e.target.checked })}
                className="h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-400"
              />
              現在、相談を受け付けている
            </label>
            {advisorMessage && <p className="text-xs font-semibold text-brand-700">{advisorMessage}</p>}
            <button
              type="submit"
              disabled={advisorSaving}
              className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {advisorSaving ? '保存しています…' : '保存する'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
