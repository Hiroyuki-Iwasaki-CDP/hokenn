import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useInsurance } from '../store/InsuranceContext'
import { getCategory } from '../lib/categories'
import { formatDate, formatYen } from '../lib/format'
import { ApiError } from '../lib/api'
import type { CategoryId, PolicyInput, PolicyStatus } from '../types/insurance'
import StepIndicator from '../components/policy/form/StepIndicator'
import CategoryPicker from '../components/policy/form/CategoryPicker'
import { DateField, FieldRow, NumberField, SelectField, TextAreaField, TextField } from '../components/policy/form/fields'
import BetaNotice from '../components/common/BetaNotice'

const STEP_LABELS = ['誰の保険か', '何に備える保険か', '保険会社と保険料', '契約日など(任意)', '確認']

const STATUS_OPTIONS: { value: PolicyStatus; label: string }[] = [
  { value: 'active', label: '有効(契約中)' },
  { value: 'lapsed', label: '失効' },
  { value: 'cancelled', label: '解約' },
  { value: 'matured', label: '満期' },
]

function emptyDraft(): PolicyInput {
  return {
    insuredPersonName: '',
    category: 'medical',
    insuranceCompany: '',
    productName: '',
    policyNumber: '',
    monthlyPremium: 0,
    coverageSummary: '',
    contractDate: '',
    renewalDate: '',
    status: 'active',
    memo: '',
  }
}

export default function PolicyForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { getPolicy, addPolicy, updatePolicy, loading: contextLoading } = useInsurance()

  const existing = isEdit ? getPolicy(id) : undefined
  const [draft, setDraft] = useState<PolicyInput>(() =>
    existing
      ? {
          insuredPersonName: existing.insuredPersonName,
          category: existing.category,
          insuranceCompany: existing.insuranceCompany,
          productName: existing.productName,
          policyNumber: existing.policyNumber ?? '',
          monthlyPremium: existing.monthlyPremium,
          coverageSummary: existing.coverageSummary ?? '',
          contractDate: existing.contractDate ?? '',
          renewalDate: existing.renewalDate ?? '',
          status: existing.status,
          memo: existing.memo ?? '',
        }
      : emptyDraft(),
  )
  const [step, setStep] = useState(0)
  const [attemptedNext, setAttemptedNext] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const patch = (p: Partial<PolicyInput>) => setDraft((d) => ({ ...d, ...p }))
  const categoryMeta = getCategory(draft.category)

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return draft.insuredPersonName.trim() !== ''
      case 2:
        return draft.insuranceCompany.trim() !== '' && draft.productName.trim() !== '' && draft.monthlyPremium >= 0
      default:
        return true
    }
  }, [step, draft])

  if (isEdit && contextLoading) return null

  if (isEdit && !existing) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center">
        <p className="text-sm text-ink-secondary">編集対象の保険が見つかりませんでした。</p>
        <Link to="/policies" className="mt-3 inline-block text-sm font-bold text-brand-700">
          保険一覧へ戻る
        </Link>
      </div>
    )
  }

  const goNext = () => {
    if (!stepValid) {
      setAttemptedNext(true)
      return
    }
    setAttemptedNext(false)
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1))
  }
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const handleSubmit = async () => {
    if (!stepValid || submitting) return
    setSubmitError(null)
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updatePolicy(id, draft)
        navigate(`/policies/${id}`)
      } else {
        const newId = await addPolicy(draft)
        navigate(`/policies/${newId}`)
      }
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'エラーが発生しました。しばらくしてから再度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  const isLastStep = step === STEP_LABELS.length - 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/policies" className="flex items-center gap-1.5 text-sm font-semibold text-ink-secondary hover:text-ink">
          <ArrowLeft size={16} />
          キャンセルして戻る
        </Link>
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">
          {isEdit ? 'Edit Policy' : 'New Policy'}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{isEdit ? '保険を編集' : '保険を登録'}</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          全{STEP_LABELS.length}ステップです。ひとつずつ入力すれば大丈夫です。
        </p>
      </div>

      {!isEdit && <BetaNotice />}

      <StepIndicator steps={STEP_LABELS} current={step} onJump={setStep} />

      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-base font-bold text-ink">
          STEP {step + 1}. {STEP_LABELS[step]}
        </h2>

        {step === 0 && (
          <div className="space-y-4">
            <TextField
              label="保険の対象者"
              required
              hint="誰のための保険か"
              value={draft.insuredPersonName}
              onChange={(v) => patch({ insuredPersonName: v })}
              placeholder="例: わたし、配偶者、長男 など"
            />
            <SelectField
              label="契約状態"
              required
              value={draft.status}
              onChange={(v) => patch({ status: v as PolicyStatus })}
              options={STATUS_OPTIONS}
            />
            {attemptedNext && !stepValid && (
              <p className="text-xs font-semibold text-red-600">保険の対象者を入力してください。</p>
            )}
          </div>
        )}

        {step === 1 && <CategoryPicker value={draft.category} onChange={(v) => patch({ category: v as CategoryId })} />}

        {step === 2 && (
          <div className="space-y-4">
            <FieldRow>
              <TextField
                label="保険会社"
                required
                value={draft.insuranceCompany}
                onChange={(v) => patch({ insuranceCompany: v })}
                placeholder="例: みらい生命保険"
              />
              <TextField
                label="商品名"
                required
                value={draft.productName}
                onChange={(v) => patch({ productName: v })}
                placeholder="例: 終身医療保険 リブフル"
              />
            </FieldRow>
            <NumberField
              label="月額保険料"
              required
              unit="円"
              value={draft.monthlyPremium || undefined}
              onChange={(v) => patch({ monthlyPremium: v ?? 0 })}
              placeholder="0"
            />
            <TextField
              label="証券番号"
              value={draft.policyNumber}
              onChange={(v) => patch({ policyNumber: v })}
              placeholder="保険証券に記載の番号(任意)"
              hint="一覧画面では下4桁以外がマスキング表示されます"
            />
            {attemptedNext && !stepValid && (
              <p className="text-xs font-semibold text-red-600">保険会社・商品名・月額保険料を入力してください。</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <TextAreaField
              label="保障内容の要約"
              value={draft.coverageSummary}
              onChange={(v) => patch({ coverageSummary: v })}
              placeholder="例: 入院日額5,000円、手術給付金あり"
              rows={3}
            />
            <FieldRow>
              <DateField label="契約日" value={draft.contractDate} onChange={(v) => patch({ contractDate: v })} />
              <DateField
                label="次回更新日"
                value={draft.renewalDate}
                onChange={(v) => patch({ renewalDate: v })}
                hint="終身の場合は未入力のままで構いません"
              />
            </FieldRow>
            <TextAreaField
              label="メモ"
              value={draft.memo}
              onChange={(v) => patch({ memo: v })}
              placeholder="請求方法や気づいたことなど、自由に記録できます"
              rows={3}
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-secondary">
              入力内容をご確認のうえ、「{isEdit ? '保存する' : '登録する'}」を押してください。
            </p>
            <dl className="divide-y divide-line rounded-xl border border-line">
              {[
                ['保険の対象者', draft.insuredPersonName || '—'],
                ['契約状態', STATUS_OPTIONS.find((o) => o.value === draft.status)?.label ?? '—'],
                ['保障分野', categoryMeta.label],
                ['保険会社', draft.insuranceCompany || '—'],
                ['商品名', draft.productName || '—'],
                ['証券番号', draft.policyNumber || '未入力'],
                ['月額保険料', formatYen(draft.monthlyPremium)],
                ['保障内容の要約', draft.coverageSummary || '未入力'],
                ['契約日', draft.contractDate ? formatDate(draft.contractDate) : '未入力'],
                ['次回更新日', draft.renewalDate ? formatDate(draft.renewalDate) : '未入力(終身扱い)'],
                ['メモ', draft.memo || '未入力'],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="text-sm font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {submitError && <p className="text-xs font-semibold text-red-600">{submitError}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="flex items-center gap-1.5 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink-secondary hover:bg-plane disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={15} />
          戻る
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? '送信しています…' : isEdit ? '保存する' : '登録する'}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-1.5 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
          >
            次へ
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  )
}
