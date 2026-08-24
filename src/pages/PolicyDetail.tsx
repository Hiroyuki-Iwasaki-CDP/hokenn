import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  FileText,
  ShieldCheck,
  Coins,
  Wallet,
  CalendarRange,
  RefreshCw,
  PiggyBank,
  Landmark,
  Phone,
  Hash,
  StickyNote,
  Paperclip,
} from 'lucide-react'
import { useInsurance } from '../store/InsuranceContext'
import { getCategory } from '../lib/categories'
import { PREMIUM_FREQUENCY_LABEL, CONTRACT_TYPE_LABEL, STATUS_META } from '../lib/status'
import { formatDate, formatMoneyWithYen } from '../lib/format'
import { toAnnualPremium } from '../lib/calculations'
import CategoryIcon from '../components/common/CategoryIcon'
import PolicyStatusBadge from '../components/common/PolicyStatusBadge'
import EmptyState from '../components/common/EmptyState'
import DetailSection, { Field, FieldGrid } from '../components/policy/DetailSection'
import RiderCard from '../components/policy/RiderCard'
import ExchangeRateNote from '../components/common/ExchangeRateNote'
import { useExchangeRate } from '../store/ExchangeRateContext'

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getPolicy, loading, deletePolicy } = useInsurance()
  const { usdJpy } = useExchangeRate()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const policy = id ? getPolicy(id) : undefined

  if (loading) return null

  if (!policy) {
    return (
      <EmptyState
        title="保険が見つかりませんでした"
        description="削除された可能性があります。一覧から選び直してください。"
        action={
          <Link
            to="/policies"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
          >
            保険一覧へ戻る
          </Link>
        }
      />
    )
  }

  const meta = getCategory(policy.category)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deletePolicy(policy.id)
      navigate('/policies')
    } finally {
      setDeleting(false)
    }
  }

  const fieldValueDisplay = (key: (typeof meta.fields)[number]) => {
    const value = policy[key]
    if (value === undefined || value === null) return '—'
    return formatMoneyWithYen(value, policy.currency, usdJpy, key === 'hospitalizationDaily')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/policies" className="flex items-center gap-1.5 text-sm font-semibold text-ink-secondary hover:text-ink">
          <ArrowLeft size={16} />
          保険一覧へ戻る
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to={`/policies/${policy.id}/edit`}
            className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-sm font-bold text-ink-secondary hover:bg-plane"
          >
            <Pencil size={15} />
            編集
          </Link>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-sm font-bold text-ink-secondary hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={15} />
            削除
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">この保険を削除しますか?この操作は取り消せません。</p>
          <p className="mt-0.5 text-xs text-red-600">「{policy.productName}」の登録内容がすべて削除されます。</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? '削除しています…' : '削除する'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-ink-secondary hover:bg-plane"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <CategoryIcon category={policy.category} size="lg" />
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                >
                  {meta.label}
                </span>
                <PolicyStatusBadge status={policy.status} />
              </div>
              <h1 className="text-xl font-bold text-ink sm:text-2xl">{policy.productName}</h1>
              <p className="mt-0.5 text-sm text-ink-secondary">{policy.insuranceCompany}</p>
            </div>
          </div>
          <div className="rounded-xl bg-plane px-4 py-3 text-right">
            <p className="text-xs text-ink-muted">{meta.headlineLabel}</p>
            <p className="text-xl font-bold text-ink tabular-nums">
              {formatMoneyWithYen(policy[meta.headline], policy.currency, usdJpy, meta.headline === 'hospitalizationDaily')}
            </p>
          </div>
        </div>
      </div>

      {policy.currency === 'USD' && <ExchangeRateNote />}

      <DetailSection title="契約者と被保険者" icon={<Users size={17} />}>
        <FieldGrid>
          <Field label="契約者" value={policy.contractorName || '—'} />
          <Field label="被保険者" value={policy.insuredPersonName} />
          <Field label="契約状態" value={STATUS_META[policy.status].label} />
        </FieldGrid>
      </DetailSection>

      <DetailSection title="主契約" icon={<ShieldCheck size={17} />}>
        <FieldGrid>
          <Field label="保険会社" value={policy.insuranceCompany} />
          <Field label="商品名" value={policy.productName} />
          <Field label="主契約の内容" value={policy.mainContractName || '—'} />
          <Field label="保障分野" value={meta.label} />
        </FieldGrid>
      </DetailSection>

      {policy.coverageSummary && (
        <DetailSection title="保障内容の要約" icon={<StickyNote size={17} />}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">{policy.coverageSummary}</p>
        </DetailSection>
      )}

      {policy.riders.length > 0 && (
        <DetailSection title="特約" icon={<FileText size={17} />}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {policy.riders.map((rider) => (
              <RiderCard key={rider.id} rider={rider} currency={policy.currency} />
            ))}
          </div>
        </DetailSection>
      )}

      <DetailSection title="保障額・給付額" icon={<Coins size={17} />}>
        <FieldGrid>
          {meta.fields.map((key) => (
            <Field key={key} label={meta.fieldLabels[key] ?? key} value={fieldValueDisplay(key)} />
          ))}
        </FieldGrid>
      </DetailSection>

      <DetailSection title="保険料" icon={<Wallet size={17} />}>
        <FieldGrid>
          <Field label="通貨" value={policy.currency === 'USD' ? 'ドル建て（USD）' : '円建て（JPY）'} />
          <Field label="保険料" value={formatMoneyWithYen(policy.premiumAmount, policy.currency, usdJpy)} />
          <Field label="支払頻度" value={PREMIUM_FREQUENCY_LABEL[policy.premiumFrequency]} />
          <Field label="年間換算額" value={formatMoneyWithYen(toAnnualPremium(policy), policy.currency, usdJpy)} />
        </FieldGrid>
      </DetailSection>

      <DetailSection title="契約期間" icon={<CalendarRange size={17} />}>
        <FieldGrid>
          <Field label="契約日" value={formatDate(policy.contractDate)} />
          <Field label="契約タイプ" value={policy.contractType ? CONTRACT_TYPE_LABEL[policy.contractType] : '—'} />
          <Field
            label="保障終了"
            value={
              policy.coverageEndAge
                ? `${policy.coverageEndAge}歳まで`
                : policy.maturityDate
                  ? formatDate(policy.maturityDate)
                  : '一生涯(終身)'
            }
          />
        </FieldGrid>
      </DetailSection>

      <DetailSection title="保険料の払込期間" icon={<RefreshCw size={17} />}>
        <FieldGrid>
          <Field
            label="払込満了"
            value={
              policy.premiumEndAge
                ? `${policy.premiumEndAge}歳まで`
                : policy.premiumEndDate
                  ? formatDate(policy.premiumEndDate)
                  : '契約期間中ずっと払い続けます'
            }
          />
        </FieldGrid>
      </DetailSection>

      {(policy.renewalDate || policy.maturityDate) && (
        <DetailSection title="更新・満期" icon={<RefreshCw size={17} />}>
          <FieldGrid>
            {policy.renewalDate && <Field label="次回更新日" value={formatDate(policy.renewalDate)} />}
            {policy.maturityDate && <Field label="満期日" value={formatDate(policy.maturityDate)} />}
          </FieldGrid>
        </DetailSection>
      )}

      <DetailSection title="解約返戻金・貯蓄性" icon={<PiggyBank size={17} />}>
        <FieldGrid>
          <Field label="貯蓄性" value={policy.hasCashValue ? 'あり(解約返戻金・満期金があります)' : 'なし(掛け捨て型)'} />
        </FieldGrid>
        {policy.cashValueNote && (
          <p className="mt-4 rounded-xl bg-plane px-3.5 py-2.5 text-xs leading-relaxed text-ink-secondary">
            {policy.cashValueNote}
          </p>
        )}
      </DetailSection>

      {policy.beneficiary && (
        <DetailSection title="受取人" icon={<Landmark size={17} />}>
          <FieldGrid>
            <Field label="受取人" value={policy.beneficiary} />
          </FieldGrid>
        </DetailSection>
      )}

      {(policy.agentName || policy.contactInfo) && (
        <DetailSection title="担当窓口・連絡先" icon={<Phone size={17} />}>
          <FieldGrid>
            {policy.agentName && <Field label="担当者" value={policy.agentName} />}
            {policy.contactInfo && <Field label="問い合わせ先" value={policy.contactInfo} />}
          </FieldGrid>
        </DetailSection>
      )}

      {policy.policyNumber && (
        <DetailSection title="証券番号" icon={<Hash size={17} />}>
          <p className="text-[15px] font-semibold text-ink tabular-nums">{policy.policyNumber}</p>
        </DetailSection>
      )}

      {policy.memo && (
        <DetailSection title="メモ" icon={<StickyNote size={17} />}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">{policy.memo}</p>
        </DetailSection>
      )}

      {policy.attachmentNames.length > 0 && (
        <DetailSection title="書類名メモ（ファイル本体は未保存）" icon={<Paperclip size={17} />}>
          <ul className="space-y-2">
            {policy.attachmentNames.map((name) => (
              <li key={name} className="flex items-center gap-2 rounded-xl bg-plane px-3.5 py-2.5 text-sm text-ink">
                <Paperclip size={14} className="shrink-0 text-ink-muted" />
                <span className="truncate">{name}</span>
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
    </div>
  )
}
