import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, User, Users as UsersIcon } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../store/AuthContext'
import type { AdvisorProfile, AuthUser } from '../types/insurance'

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

export default function Settings() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth()

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)

  const [advisor, setAdvisor] = useState<AdvisorProfile | null>(null)
  const [advisorLoading, setAdvisorLoading] = useState(true)
  const [advisorSaving, setAdvisorSaving] = useState(false)
  const [advisorMessage, setAdvisorMessage] = useState<string | null>(null)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
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

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setProfileMessage(null)
    setProfileSaving(true)
    try {
      const data = await api.put<{ user: AuthUser }>('/api/profile', {
        displayName: displayName.trim(),
        manageScope: user?.manageScope ?? 'self',
        termsAccepted: true,
        sensitiveInfoAcknowledged: true,
      })
      setUser(data.user)
      setProfileMessage('保存しました。')
    } catch (err) {
      setProfileMessage(err instanceof ApiError ? err.message : 'エラーが発生しました。')
    } finally {
      setProfileSaving(false)
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

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.post('/api/account/delete')
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'エラーが発生しました。')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Settings</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">設定</h1>
      </div>

      <form onSubmit={handleProfileSubmit} className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <User size={16} />
          プロフィール
        </h2>
        <TextInput label="表示名" value={displayName} onChange={setDisplayName} placeholder="例: 佐藤 健太" />
        {profileMessage && <p className="text-xs font-semibold text-brand-700">{profileMessage}</p>}
        <button
          type="submit"
          disabled={profileSaving || displayName.trim() === ''}
          className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {profileSaving ? '保存しています…' : '保存する'}
        </button>
      </form>

      <form onSubmit={handleAdvisorSubmit} className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <UsersIcon size={16} />
          担当FPの連絡先
        </h2>
        <p className="text-xs text-ink-muted">
          担当のファイナンシャルプランナーの連絡先です。このアプリへのログイン権限は担当者には付与されません。
        </p>
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

      <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-red-700">
          <AlertTriangle size={16} />
          退会
        </h2>
        <p className="text-xs leading-relaxed text-red-700">
          退会すると、登録した保険情報・担当者情報を含むすべてのデータが削除され、二度とログインできなくなります。この操作は取り消せません。
        </p>
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
          >
            退会する
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? '処理しています…' : '本当に退会する'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink-secondary hover:bg-plane"
            >
              キャンセル
            </button>
          </div>
        )}
        {deleteError && <p className="text-xs font-semibold text-red-700">{deleteError}</p>}
      </div>
    </div>
  )
}
