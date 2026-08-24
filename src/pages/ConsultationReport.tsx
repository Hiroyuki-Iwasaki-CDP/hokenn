import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, CalendarClock, CalendarPlus, CheckCircle2, ClipboardCheck, MessageCircle, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useInsurance } from '../store/InsuranceContext'
import { useAuth } from '../store/AuthContext'
import { useExchangeRate } from '../store/ExchangeRateContext'
import { CATEGORY_ORDER, getCategory, tint } from '../lib/categories'
import { buildConsultationInsights, registeredActiveCategories } from '../lib/consultationInsights'
import { sumMonthlyPremiumInYen } from '../lib/calculations'
import { formatYen } from '../lib/format'
import { downloadConsultationCalendar } from '../lib/calendar'
import type { ConsultationAppointment, ConsultationTopic } from '../types/insurance'

const TOPIC_LABELS: Record<ConsultationTopic, string> = {
  review: '保険全体を整理したい',
  renewal: '更新・満期について確認したい',
  family: '家族構成の変化について相談したい',
  premium: '保険料の負担を確認したい',
  other: 'その他の相談',
}

function localDateTimeValue(date: Date): string {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return adjusted.toISOString().slice(0, 16)
}

function defaultChoice(daysAhead: number, hour: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  date.setHours(hour, 0, 0, 0)
  return localDateTimeValue(date)
}

function formatAppointmentDate(value: string): string {
  return new Date(value).toLocaleString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function ConsultationReport() {
  const { policies, loading } = useInsurance()
  const { user } = useAuth()
  const { usdJpy } = useExchangeRate()
  const [appointments, setAppointments] = useState<ConsultationAppointment[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [topic, setTopic] = useState<ConsultationTopic>('review')
  const [firstChoice, setFirstChoice] = useState(() => defaultChoice(1, 10))
  const [secondChoice, setSecondChoice] = useState(() => defaultChoice(2, 14))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadAppointments = (silent = false) => {
    if (!silent) setAppointmentsLoading(true)
    api.get<{ appointments: ConsultationAppointment[] }>('/api/consultations')
      .then((data) => setAppointments(data.appointments))
      .catch((err) => setError(err instanceof ApiError ? err.message : '相談申込みを読み込めませんでした。'))
      .finally(() => setAppointmentsLoading(false))
  }

  useEffect(() => {
    loadAppointments()
    const refreshTimer = window.setInterval(() => loadAppointments(true), 60_000)
    return () => window.clearInterval(refreshTimer)
  }, [])

  const activePolicies = useMemo(() => policies.filter((policy) => policy.status === 'active'), [policies])
  const registered = useMemo(() => registeredActiveCategories(activePolicies), [activePolicies])
  const insights = useMemo(() => buildConsultationInsights(policies), [policies])
  const monthlyTotal = useMemo(() => sumMonthlyPremiumInYen(activePolicies, usdJpy), [activePolicies, usdJpy])
  const activeAppointment = appointments.find((item) => item.status === 'requested' || item.status === 'confirmed')
  const pastAppointments = appointments.filter((item) => item.status === 'completed' || item.status === 'cancelled').slice(0, 10)
  const minDateTime = localDateTimeValue(new Date(Date.now() + 30 * 60 * 1000))
  const maxDateTime = localDateTimeValue(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || !firstChoice) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api.post('/api/consultations', {
        topic,
        firstChoiceAt: new Date(firstChoice).toISOString(),
        secondChoiceAt: secondChoice ? new Date(secondChoice).toISOString() : null,
      })
      setMessage('担当者へ相談日時の候補を送信しました。確定後に担当者からご連絡します。')
      loadAppointments()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '相談を申し込めませんでした。')
    } finally {
      setSaving(false)
    }
  }

  const cancel = async (id: string) => {
    if (saving) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api.patch('/api/consultations', { id, status: 'cancelled' })
      setMessage('相談申込みを取り消しました。')
      loadAppointments()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '相談申込みを取り消せませんでした。')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Consultation Report</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">保険の見える化レポート</h1>
        <p className="mt-1 text-sm text-ink-secondary">登録内容を整理し、担当者と確認したいポイントをまとめます。</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-xs font-semibold text-ink-muted">加入中の保険</p>
          <p className="mt-2 text-2xl font-bold text-ink">{activePolicies.length}<span className="ml-1 text-sm">件</span></p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-xs font-semibold text-ink-muted">登録済みの保障分野</p>
          <p className="mt-2 text-2xl font-bold text-ink">{registered.size}<span className="ml-1 text-sm">分野</span></p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-xs font-semibold text-ink-muted">毎月の保険料</p>
          <p className="mt-2 text-2xl font-bold text-ink">{formatYen(Math.round(monthlyTotal))}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><ShieldCheck size={17} />保障分野の登録状況</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">登録がない分野は、保障不足を意味するものではありません。確認項目の整理に使用します。</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORY_ORDER.filter((id) => id !== 'other').map((id) => {
            const meta = getCategory(id)
            const Icon = meta.icon
            const exists = registered.has(id)
            return (
              <div key={id} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${exists ? 'border-transparent' : 'border-line bg-plane'}`} style={exists ? { backgroundColor: tint(meta.color, '12') } : undefined}>
                <Icon size={16} style={{ color: meta.color }} />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{meta.shortLabel}</span>
                {exists ? <CheckCircle2 size={14} className="text-brand-700" /> : <span className="text-[10px] text-ink-muted">未登録</span>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><ClipboardCheck size={17} />担当者と確認したいポイント</h2>
        {insights.length === 0 ? (
          <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">登録内容から大きな確認項目は見つかりませんでした。</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {insights.map((insight) => (
              <li key={insight.kind} className="flex gap-3 rounded-xl bg-plane px-4 py-3">
                <AlertCircle size={17} className="mt-0.5 shrink-0 text-amber-600" />
                <div><p className="text-sm font-bold text-ink">{insight.title}</p><p className="mt-1 text-xs leading-relaxed text-ink-secondary">{insight.description}</p></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink"><CalendarClock size={17} />FP・担当者へ相談する</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">相談テーマと日時候補だけを送信します。証券番号・病歴・口座情報などは入力しません。相談状況は1分ごとに自動更新します。</p>

        {appointmentsLoading ? (
          <p className="mt-4 text-sm text-ink-muted">相談状況を読み込み中…</p>
        ) : activeAppointment ? (
          <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-brand-900">{activeAppointment.status === 'confirmed' ? '相談日時が確定しました' : '担当者の確認待ちです'}</p>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-700">{activeAppointment.status === 'confirmed' ? '日時確定' : '申込済み'}</span>
            </div>
            <p className="mt-2 text-xs text-brand-800">相談内容：{TOPIC_LABELS[activeAppointment.topic]}</p>
            {activeAppointment.confirmedStartAt ? (
              <div className="mt-1">
                <p className="text-sm font-bold text-brand-900">{formatAppointmentDate(activeAppointment.confirmedStartAt)}</p>
                <button type="button" onClick={() => downloadConsultationCalendar(activeAppointment.confirmedStartAt!, '保険相談（担当者）')} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-800"><CalendarPlus size={14} />カレンダーに追加</button>
              </div>
            ) : (
              <div className="mt-2 space-y-1 text-xs text-brand-800"><p>第1希望：{formatAppointmentDate(activeAppointment.firstChoiceAt)}</p>{activeAppointment.secondChoiceAt && <p>第2希望：{formatAppointmentDate(activeAppointment.secondChoiceAt)}</p>}</div>
            )}
            <button type="button" disabled={saving} onClick={() => cancel(activeAppointment.id)} className="mt-3 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-800 disabled:opacity-50">申込みを取り消す</button>
          </div>
        ) : user?.advisorId ? (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">相談したい内容</span><select value={topic} onChange={(event) => setTopic(event.target.value as ConsultationTopic)} className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink">{Object.entries(TOPIC_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">第1希望</span><input required type="datetime-local" min={minDateTime} max={maxDateTime} value={firstChoice} onChange={(event) => setFirstChoice(event.target.value)} className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink" /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">第2希望（任意）</span><input type="datetime-local" min={minDateTime} max={maxDateTime} value={secondChoice} onChange={(event) => setSecondChoice(event.target.value)} className="w-full rounded-xl border border-line bg-plane px-3.5 py-2.5 text-sm text-ink" /></label>
            </div>
            <button type="submit" disabled={saving || !firstChoice} className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-50"><MessageCircle size={16} />{saving ? '送信しています…' : '日時候補を担当者へ送る'}</button>
          </form>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">担当代理店が設定されていないため、アプリからの相談申込みはまだ利用できません。</p>
        )}
        {message && <p className="mt-3 text-xs font-semibold text-brand-700">{message}</p>}
        {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}

        {!appointmentsLoading && pastAppointments.length > 0 && (
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-sm font-bold text-ink">過去の相談履歴</h3>
            <p className="mt-1 text-xs text-ink-muted">完了・取消した相談を最新10件まで表示します。</p>
            <ul className="mt-3 divide-y divide-line rounded-xl bg-plane px-4">
              {pastAppointments.map((appointment) => (
                <li key={appointment.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-ink">{TOPIC_LABELS[appointment.topic]}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${appointment.status === 'completed' ? 'bg-brand-50 text-brand-800' : 'bg-white text-ink-muted'}`}>{appointment.status === 'completed' ? '相談完了' : '取消'}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-ink-muted">申込：{formatAppointmentDate(appointment.requestedAt)}</p>
                    {appointment.confirmedStartAt && <p className="mt-0.5 text-[11px] font-semibold text-ink-secondary">相談日時：{formatAppointmentDate(appointment.confirmedStartAt)}</p>}
                  </div>
                  {appointment.status === 'completed' && appointment.confirmedStartAt && (
                    <button type="button" onClick={() => downloadConsultationCalendar(appointment.confirmedStartAt!, '保険相談（担当者）')} className="inline-flex shrink-0 items-center justify-center gap-1 self-start rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-ink-secondary sm:self-auto"><CalendarPlus size={14} />カレンダーに追加</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <p className="rounded-xl bg-plane px-4 py-3 text-xs leading-relaxed text-ink-secondary">
        このレポートは登録内容を整理するためのもので、保険商品の推奨、必要保障額の判定、加入・解約の助言ではありません。具体的な判断は担当者へご相談ください。
      </p>
    </div>
  )
}
