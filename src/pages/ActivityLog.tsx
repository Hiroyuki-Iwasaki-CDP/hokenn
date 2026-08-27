import { useEffect, useState } from 'react'
import { History, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import type { AuditLogEntry } from '../types/insurance'

const ACTION_LABELS: Record<string, string> = {
  login: 'ログイン', logout: 'ログアウト', line_login: 'LINEでログイン', line_link: 'LINE連携', line_unlink: 'LINE連携解除',
  create: '保険を登録', update: '情報を更新', delete: '保険を削除', invite_client: '顧客を招待',
  view_shared_policies: '共有された保険を閲覧', grant_full_policy_access: '保険情報の共有を許可', revoke_full_policy_access: '保険情報の共有を解除',
  consultation_appointment_requested: '相談日時を申込み', consultation_appointment_rescheduled: '相談日時候補を変更',
  consultation_appointment_confirmed: '相談日時を確定', consultation_appointment_completed: '相談を完了', consultation_appointment_cancelled: '相談を取消',
  line_consultation_requested: 'LINEから相談を受付', line_consultation_resolved: 'LINE相談を対応済みに変更',
  product_create: '取扱商品を登録', product_update: '取扱商品を更新', product_delete: '取扱商品の下書きを削除', update_advisor_profile: '担当者プロフィールを更新', line_notification_acknowledged: 'LINE通知の要確認を確認済みに変更', line_notification_retried: 'LINE通知を再送', line_test_notification_sent: 'LINEテスト通知を送信', line_reminder_preferences_updated: 'LINEリマインド設定を更新',
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ logs: AuditLogEntry[] }>('/api/audit-logs')
      .then((data) => setLogs(data.logs))
      .catch((err) => setError(err instanceof ApiError ? err.message : '操作履歴を読み込めませんでした。'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div><p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Activity</p><h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">操作履歴</h1><p className="mt-1 text-sm text-ink-secondary">ログイン中のご本人が行った主な操作を最新100件まで表示します。</p></div>
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-brand-50 px-4 py-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-700" /><p className="text-xs leading-relaxed text-brand-900">認証コード・証券番号・病歴・口座情報などは操作履歴に保存していません。他の利用者の履歴は表示されません。</p></div>
        {loading ? <p className="text-sm text-ink-muted">読み込み中…</p> : error ? <p className="text-sm font-semibold text-red-600">{error}</p> : logs.length === 0 ? <p className="rounded-xl bg-plane px-4 py-3 text-sm text-ink-muted">表示できる操作履歴はありません。</p> : <ul className="divide-y divide-line rounded-xl border border-line px-4">{logs.map((log) => <li key={log.id} className="flex items-center gap-3 py-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-plane text-ink-muted"><History size={15} /></span><div className="min-w-0"><p className="text-sm font-bold text-ink">{ACTION_LABELS[log.action] ?? log.action}</p><p className="mt-0.5 text-xs text-ink-muted">{formatDate(log.createdAt)}</p></div></li>)}</ul>}
      </section>
    </div>
  )
}
