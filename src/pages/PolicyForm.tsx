import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Paperclip, X } from 'lucide-react'
import { useInsurance } from '../store/InsuranceContext'
import { RELATION_LABEL } from '../lib/status'
import { getCategory } from '../lib/categories'
import { createEmptyDraft, draftFromPolicy, draftToPolicyInput, type PolicyDraft } from '../lib/policyDraft'
import type { ContractType, PolicyStatus, PremiumFrequency } from '../types/insurance'
import StepIndicator from '../components/policy/form/StepIndicator'
import CategoryPicker from '../components/policy/form/CategoryPicker'
import RiderEditor from '../components/policy/form/RiderEditor'
import { CheckboxField, DateField, FieldRow, NumberField, SelectField, TextAreaField, TextField } from '../components/policy/form/fields'

const STEP_LABELS = [
  '誰の保険か',
  '何に備える保険か',
  '保険会社と商品',
  '保障内容',
  '保険料',
  '契約期間と更新日',
  '受取人・連絡先',
  'メモと書類',
]

const STATUS_OPTIONS: { value: PolicyStatus; label: string }[] = [
  { value: 'active', label: '有効(契約中)' },
  { value: 'lapsed', label: '失効' },
  { value: 'cancelled', label: '解約' },
  { value: 'matured', label: '満期' },
]

const FREQUENCY_OPTIONS: { value: PremiumFrequency; label: string }[] = [
  { value: 'monthly', label: '月払い' },
  { value: 'yearly', label: '年払い' },
  { value: 'single', label: '一時払い' },
]

const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: 'wholelife', label: '終身型(保障が一生涯続く)' },
  { value: 'renewal', label: '更新型(一定期間ごとに更新する)' },
  { value: 'termFixed', label: '定期型(満期で保障が終わる)' },
  { value: 'singlePayment', label: '一時払い型' },
]

export default function PolicyForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { family, getPolicy, addPolicy, updatePolicy } = useInsurance()

  const existing = isEdit ? getPolicy(id) : undefined
  const [draft, setDraft] = useState<PolicyDraft>(() =>
    existing ? draftFromPolicy(existing) : createEmptyDraft(family),
  )
  const [step, setStep] = useState(0)
  const [attemptedNext, setAttemptedNext] = useState(false)

  const patch = (p: Partial<PolicyDraft>) => setDraft((d) => ({ ...d, ...p }))
  const categoryMeta = getCategory(draft.category)

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

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return draft.insuredMemberId.trim() !== '' && draft.contractorName.trim() !== ''
      case 2:
        return draft.insurerName.trim() !== '' && draft.productName.trim() !== '' && draft.mainContractName.trim() !== ''
      case 4:
        return draft.premiumAmount > 0
      case 5:
        return draft.startDate.trim() !== ''
      default:
        return true
    }
  }, [step, draft])

  const goNext = () => {
    if (!stepValid) {
      setAttemptedNext(true)
      return
    }
    setAttemptedNext(false)
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1))
  }
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const handleSubmit = () => {
    if (!stepValid) {
      setAttemptedNext(true)
      return
    }
    const input = draftToPolicyInput(draft)
    if (isEdit && id) {
      updatePolicy(id, input)
      navigate(`/policies/${id}`)
    } else {
      const newId = addPolicy(input)
      navigate(`/policies/${newId}`)
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

      <StepIndicator steps={STEP_LABELS} current={step} onJump={setStep} />

      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-base font-bold text-ink">
          STEP {step + 1}. {STEP_LABELS[step]}
        </h2>

        {step === 0 && (
          <div className="space-y-4">
            <SelectField
              label="被保険者(保障の対象者)"
              required
              value={draft.insuredMemberId}
              onChange={(v) => patch({ insuredMemberId: v })}
              options={family.map((m) => ({ value: m.id, label: `${RELATION_LABEL[m.relation]}(${m.name})` }))}
            />
            <TextField
              label="契約者"
              required
              hint="保険料を支払う人"
              value={draft.contractorName}
              onChange={(v) => patch({ contractorName: v })}
              placeholder="例: 佐藤 健太"
            />
            <SelectField
              label="契約状態"
              required
              value={draft.status}
              onChange={(v) => patch({ status: v as PolicyStatus })}
              options={STATUS_OPTIONS}
            />
            {attemptedNext && !stepValid && (
              <p className="text-xs font-semibold text-red-600">被保険者と契約者を入力してください。</p>
            )}
          </div>
        )}

        {step === 1 && <CategoryPicker value={draft.category} onChange={(v) => patch({ category: v })} />}

        {step === 2 && (
          <div className="space-y-4">
            <FieldRow>
              <TextField
                label="保険会社"
                required
                value={draft.insurerName}
                onChange={(v) => patch({ insurerName: v })}
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
            <TextField
              label="主契約の内容"
              required
              value={draft.mainContractName}
              onChange={(v) => patch({ mainContractName: v })}
              placeholder="例: 終身医療保障"
            />
            <TextField
              label="証券番号"
              value={draft.policyNumber}
              onChange={(v) => patch({ policyNumber: v })}
              placeholder="保険証券に記載の番号"
              hint="一覧画面ではマスキング表示されます"
            />
            {attemptedNext && !stepValid && (
              <p className="text-xs font-semibold text-red-600">保険会社・商品名・主契約の内容を入力してください。</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-bold text-ink">保障額・給付額</p>
              <FieldRow>
                {categoryMeta.fields.map((key) => (
                  <NumberField
                    key={key}
                    label={categoryMeta.fieldLabels[key] ?? key}
                    unit={key === 'hospitalizationDaily' ? '円/日' : '円'}
                    value={draft[key]}
                    onChange={(v) => patch({ [key]: v } as Partial<PolicyDraft>)}
                    placeholder="0"
                  />
                ))}
              </FieldRow>
            </div>
            <div>
              <p className="mb-3 text-sm font-bold text-ink">特約</p>
              <RiderEditor riders={draft.riders} onChange={(riders) => patch({ riders })} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <FieldRow>
              <NumberField
                label="保険料"
                required
                unit="円"
                value={draft.premiumAmount || undefined}
                onChange={(v) => patch({ premiumAmount: v ?? 0 })}
                placeholder="0"
              />
              <SelectField
                label="支払頻度"
                required
                value={draft.premiumFrequency}
                onChange={(v) => patch({ premiumFrequency: v as PremiumFrequency })}
                options={FREQUENCY_OPTIONS}
              />
            </FieldRow>
            {attemptedNext && !stepValid && (
              <p className="text-xs font-semibold text-red-600">保険料を入力してください。</p>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <FieldRow>
              <DateField label="契約開始日" required value={draft.startDate} onChange={(v) => patch({ startDate: v })} />
              <SelectField
                label="契約タイプ"
                required
                value={draft.contractType}
                onChange={(v) => patch({ contractType: v as ContractType })}
                options={CONTRACT_TYPE_OPTIONS}
              />
            </FieldRow>
            <FieldRow>
              <DateField label="次回更新日" value={draft.renewalDate} onChange={(v) => patch({ renewalDate: v })} />
              <DateField label="満期日" value={draft.maturityDate} onChange={(v) => patch({ maturityDate: v })} />
            </FieldRow>
            <FieldRow>
              <NumberField
                label="保障終了年齢"
                unit="歳まで"
                value={draft.coverageEndAge}
                onChange={(v) => patch({ coverageEndAge: v })}
                placeholder="例: 80"
              />
              <NumberField
                label="払込終了年齢"
                unit="歳まで"
                value={draft.premiumEndAge}
                onChange={(v) => patch({ premiumEndAge: v })}
                placeholder="例: 60"
              />
            </FieldRow>
            <DateField
              label="払込終了日"
              value={draft.premiumEndDate}
              onChange={(v) => patch({ premiumEndDate: v })}
              hint="年齢ではなく日付で決まっている場合"
            />
            <CheckboxField
              label="解約返戻金や満期金がある(貯蓄性がある)"
              checked={draft.hasCashValue}
              onChange={(v) => patch({ hasCashValue: v })}
            />
            <TextAreaField
              label="解約返戻金・貯蓄性についてのメモ"
              value={draft.cashValueNote}
              onChange={(v) => patch({ cashValueNote: v })}
              placeholder="例: 掛け捨て型のため解約返戻金はありません"
              rows={2}
            />
            {attemptedNext && !stepValid && (
              <p className="text-xs font-semibold text-red-600">契約開始日を入力してください。</p>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <TextField
              label="受取人"
              value={draft.beneficiary}
              onChange={(v) => patch({ beneficiary: v })}
              placeholder="例: 配偶者"
            />
            <FieldRow>
              <TextField
                label="担当者"
                value={draft.agentName}
                onChange={(v) => patch({ agentName: v })}
                placeholder="例: 田中 一郎"
              />
              <TextField
                label="問い合わせ先"
                value={draft.contactInfo}
                onChange={(v) => patch({ contactInfo: v })}
                placeholder="電話番号など"
              />
            </FieldRow>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-5">
            <TextAreaField
              label="メモ"
              value={draft.memo}
              onChange={(v) => patch({ memo: v })}
              placeholder="請求方法や気づいたことなど、自由に記録できます"
              rows={4}
            />
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">
                添付書類 <span className="rounded bg-plane px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">任意</span>
              </p>
              <p className="mb-2 text-xs text-ink-muted">
                ファイルの中身は保存されず、ファイル名のみが記録されます。
              </p>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50/60">
                <Paperclip size={16} />
                ファイルを選んで追加する
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? [])
                    if (files.length === 0) return
                    const names = Array.from(new Set([...draft.attachmentNames, ...files.map((f) => f.name)]))
                    patch({ attachmentNames: names })
                    e.target.value = ''
                  }}
                />
              </label>
              {draft.attachmentNames.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {draft.attachmentNames.map((name) => (
                    <li
                      key={name}
                      className="flex items-center gap-2 rounded-xl bg-plane px-3.5 py-2.5 text-sm text-ink"
                    >
                      <Paperclip size={14} className="shrink-0 text-ink-muted" />
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      <button
                        type="button"
                        onClick={() => patch({ attachmentNames: draft.attachmentNames.filter((n) => n !== name) })}
                        className="shrink-0 text-ink-muted hover:text-red-600"
                        aria-label="削除"
                      >
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
            className="flex items-center gap-1.5 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
          >
            {isEdit ? '保存する' : '登録する'}
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
