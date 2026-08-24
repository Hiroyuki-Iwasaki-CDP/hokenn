import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Download, History, Link2, ShieldCheck, User, Users as UsersIcon } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { downloadPoliciesCsv } from '../lib/policyExport'
import { useAuth } from '../store/AuthContext'
import { useInsurance } from '../store/InsuranceContext'
import type { AdvisorProfile, AuthUser, PolicySharingStatus } from '../types/insurance'

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

interface LineConnectionStatus {
  configured: boolean
  linked: boolean
  displayName: string | null
  linkedAt: string | null
}

const LINE_ERROR_MESSAGES: Record<string, string> = {
  invalid_request: 'LINEから戻った情報を確認できませんでした。もう一度お試しください。',
  token_exchange_failed: 'LINEの認証を完了できませんでした。もう一度お試しください。',
  missing_id_token: 'LINEの本人確認情報を取得できませんでした。',
  verification_failed: 'LINEの本人確認情報を検証できませんでした。',
  invalid_user: 'LINEユーザーを確認できませんでした。',
  already_linked: 'このLINEアカウントは、すでに別の契約者アカウントと連携されています。',
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth()
  const { policies, loading: policiesLoading } = useInsurance()

  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)

  const [lineConnection, setLineConnection] = useState<LineConnectionStatus | null>(null)
  const [lineLoading, setLineLoading] = useState(true)
  const [lineSaving, setLineSaving] = useState(false)
  const [lineMessage, setLineMessage] = useState<string | null>(null)
  const [lineError, setLineError] = useState<string | null>(null)

  const [advisor, setAdvisor] = useState<AdvisorProfile | null>(null)
  const [managedByAdvisorAccount, setManagedByAdvisorAccount] = useState(false)
  const [advisorLoading, setAdvisorLoading] = useState(true)
  const [advisorSaving, setAdvisorSaving] = useState(false)
  const [advisorMessage, setAdvisorMessage] = useState<string | null>(null)

  const [sharing, setSharing] = useState<PolicySharingStatus | null>(null)
  const [sharingLoading, setSharingLoading] = useState(true)
  const [sharingSaving, setSharingSaving] = useState(false)
  const [sharingConfirmed, setSharingConfirmed] = useState(false)
  const [sharingMessage, setSharingMessage] = useState<string | null>(null)
  const [sharingError, setSharingError] = useState<string | null>(null)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const lineResult = search.get('line')
    if (lineResult === 'linked') setLineMessage('LINEアカウントを連携しました。')
    if (lineResult === 'error') {
      const reason = search.get('reason') ?? ''
      setLineError(LINE_ERROR_MESSAGES[reason] ?? 'LINEアカウントを連携できませんでした。')
    }

    api
      .get<LineConnectionStatus>('/api/auth/line/status')
      .then(setLineConnection)
      .catch((err) => setLineError(err instanceof ApiError ? err.message : 'LINE連携状態を確認できませんでした。'))
      .finally(() => setLineLoading(false))

    api
      .get<{ advisor: AdvisorProfile | null; managedByAdvisorAccount: boolean }>('/api/my-advisor')
      .then((data) => {
        setManagedByAdvisorAccount(data.managedByAdvisorAccount)
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
        )
      })
      .finally(() => setAdvisorLoading(false))

    api
      .get<{ sharing: PolicySharingStatus }>('/api/policy-sharing')
      .then((data) => setSharing(data.sharing))
      .catch((err) => setSharingError(err instanceof ApiError ? err.message : '共有設定を読み込めませんでした。'))
      .finally(() => setSharingLoading(false))
  }, [])

  const handleLineConnect = () => {
    setLineError(null)
    window.location.assign('/api/auth/line/start?flow=link')
  }

  const handleLineUnlink = async () => {
    if (lineSaving) return
    setLineSaving(true)
    setLineMessage(null)
    setLineError(null)
    try {
      await api.del<{ ok: true }>('/api/auth/line/status')
      setLineConnection((current) =>
        current ? { ...current, linked: false, displayName: null, linkedAt: null } : current,
      )
      setLineMessage('アプリとのLINE連携を解除しました。')
    } catch (err) {
      setLineError(err instanceof ApiError ? err.message : 'LINE連携を解除できませんでした。')
    } finally {
      setLineSaving(false)
    }
  }

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

  const handleSharingUpdate = async (enabled: boolean) => {
    if (sharingSaving) return
    setSharingSaving(true)
    setSharingMessage(null)
    setSharingError(null)
    try {
      const data = await api.put<{ sharing: PolicySharingStatus }>('/api/policy-sharing',
        enabled ? { enabled: true, confirmation: sharingConfirmed } : { enabled: false },
      )
      setSharing(data.sharing)
      setSharingConfirmed(false)
      setSharingMessage(enabled ? '担当代理店への全件共有を許可しました。' : '共有を解除しました。')
    } catch (err) {
      setSharingError(err instanceof ApiError ? err.message : '共有設定を変更できませんでした。')
    } finally {
      setSharingSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Settings</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">設定</h1>
      </div>

      <Link to="/activity" className="flex items-center justify-between rounded-2xl border border-line bg-white p-5 text-sm font-bold text-ink hover:bg-plane sm:p-6"><span className="flex items-center gap-2"><History size={17} />操作履歴を確認</span><span className="text-xs font-semibold text-brand-700">最新100件</span></Link>

      <div className="space-y-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><Download size={16} />登録データの保存</h2>
        <p className="text-xs leading-relaxed text-ink-muted">
          登録している保険情報をCSV形式で端末に保存します。証券番号・受取人・メモなども含まれるため、ダウンロード後のファイルは安全な場所で管理してください。
        </p>
        <button
          type="button"
          onClick={() => downloadPoliciesCsv(policies)}
          disabled={policiesLoading || policies.length === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-bold text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} />
          {policiesLoading ? '読み込んでいます…' : policies.length === 0 ? '保存するデータがありません' : `保険情報をCSVで保存（${policies.length}件）`}
        </button>
        <p className="text-[11px] text-ink-muted">ファイル本体はアプリへ送信されず、この端末内にダウンロードされます。</p>
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

      <div className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <Link2 size={16} />
          LINEアカウント連携
        </h2>
        <p className="text-xs leading-relaxed text-ink-muted">
          本人のLINEアカウントをこの契約者アカウントに紐づけます。連携後は、公式LINEから契約内容の確認画面へ安全に案内できるようになります。
        </p>

        {lineLoading ? (
          <p className="text-sm text-ink-muted">確認しています…</p>
        ) : lineConnection?.linked ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-brand-700" />
              <div>
                <p className="text-sm font-bold text-brand-800">LINE連携済み</p>
                <p className="mt-1 text-xs text-brand-700">
                  {lineConnection.displayName ? `${lineConnection.displayName}さんのLINEアカウント` : 'LINEアカウント'}
                  {lineConnection.linkedAt &&
                    `・連携日 ${new Date(lineConnection.linkedAt).toLocaleDateString('ja-JP')}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleLineUnlink()}
              disabled={lineSaving}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink-secondary hover:bg-plane disabled:cursor-not-allowed disabled:opacity-60"
            >
              {lineSaving ? '解除しています…' : 'アプリとの連携を解除する'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleLineConnect}
              disabled={!lineConnection?.configured}
              className="rounded-xl bg-[#06C755] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#05b64d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              LINEアカウントを連携する
            </button>
            {!lineConnection?.configured && (
              <p className="text-xs text-amber-700">LINE Loginの環境変数を設定すると連携ボタンを利用できます。</p>
            )}
          </div>
        )}

        {lineMessage && <p className="text-xs font-semibold text-brand-700">{lineMessage}</p>}
        {lineError && <p className="text-xs font-semibold text-red-600">{lineError}</p>}
        <p className="text-[11px] leading-relaxed text-ink-muted">
          連携しても、担当代理店への保険情報共有は自動で有効になりません。共有は下の「保険情報の共有」で別途許可します。
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <UsersIcon size={16} />
          担当FPの連絡先
        </h2>
        <p className="text-xs text-ink-muted">
          担当のファイナンシャルプランナーの連絡先です。下の「保険情報の共有」で許可しない限り、担当者に保険内容は表示されません。
        </p>
        {advisorLoading || !advisor ? (
          <p className="text-sm text-ink-muted">読み込み中…</p>
        ) : managedByAdvisorAccount ? (
          <div className="space-y-1.5 rounded-xl bg-plane px-4 py-3 text-sm text-ink">
            <p className="text-xs text-ink-muted">この情報は担当者ご本人が管理しています。</p>
            <p className="font-semibold">{advisor.advisorName || '未設定'}</p>
            {advisor.agencyName && <p className="text-ink-secondary">{advisor.agencyName}</p>}
            {advisor.phone && <p className="text-ink-secondary">{advisor.phone}</p>}
            {advisor.email && <p className="text-ink-secondary">{advisor.email}</p>}
          </div>
        ) : (
          <form onSubmit={handleAdvisorSubmit} className="space-y-4">
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
          </form>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <ShieldCheck size={16} />
          保険情報の共有
        </h2>
        <p className="text-xs leading-relaxed text-ink-muted">
          信頼できる担当代理店に、登録中のすべての保険情報を閲覧専用で共有できます。担当者は内容を変更・削除できません。
        </p>

        {sharingLoading ? (
          <p className="text-sm text-ink-muted">読み込み中…</p>
        ) : !managedByAdvisorAccount || !sharing?.available ? (
          <div className="rounded-xl bg-plane px-4 py-3 text-sm text-ink-secondary">
            代理店から招待され、担当者と紐づくと共有設定を利用できます。
          </div>
        ) : sharing.enabled ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
              <p className="text-sm font-bold text-brand-800">全保険情報を共有中です</p>
              <p className="mt-1 text-xs leading-relaxed text-brand-700">
                証券番号、保険料、保障内容、特約、受取人、メモを含む登録情報を、現在の担当者が閲覧できます。
                {sharing.grantedAt && ` 許可日: ${new Date(sharing.grantedAt).toLocaleDateString('ja-JP')}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSharingUpdate(false)}
              disabled={sharingSaving}
              className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sharingSaving ? '変更しています…' : '共有を解除する'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-plane px-4 py-3 text-xs leading-relaxed text-ink-secondary">
              共有を許可すると、現在登録している情報だけでなく、今後追加・更新する保険情報も担当者から閲覧可能になります。共有はいつでも解除できます。
            </div>
            <label className="flex items-start gap-2.5 text-sm text-ink-secondary">
              <input
                type="checkbox"
                checked={sharingConfirmed}
                onChange={(e) => setSharingConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-400"
              />
              <span>共有される情報と閲覧範囲を確認し、現在の担当代理店への全件共有に同意します。</span>
            </label>
            <button
              type="button"
              onClick={() => void handleSharingUpdate(true)}
              disabled={sharingSaving || !sharingConfirmed}
              className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sharingSaving ? '保存しています…' : '全保険情報の共有を許可する'}
            </button>
          </div>
        )}

        {sharingMessage && <p className="text-xs font-semibold text-brand-700">{sharingMessage}</p>}
        {sharingError && <p className="text-xs font-semibold text-red-600">{sharingError}</p>}
      </div>

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
