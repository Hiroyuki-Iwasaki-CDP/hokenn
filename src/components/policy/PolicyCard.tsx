import { Link } from 'react-router-dom'
import { Pencil, ChevronRight } from 'lucide-react'
import type { InsurancePolicy } from '../../types/insurance'
import { getCategory } from '../../lib/categories'
import { PREMIUM_FREQUENCY_LABEL, RELATION_LABEL } from '../../lib/status'
import { formatDate, formatYen, maskPolicyNumber } from '../../lib/format'
import CategoryIcon from '../common/CategoryIcon'
import PolicyStatusBadge from '../common/PolicyStatusBadge'

export default function PolicyCard({
  policy,
  insuredName,
  insuredRelation,
}: {
  policy: InsurancePolicy
  insuredName: string
  insuredRelation: string
}) {
  const meta = getCategory(policy.category)
  const headlineValue = policy[meta.headline]
  const headlineText =
    meta.headline === 'hospitalizationDaily' && headlineValue
      ? `${formatYen(headlineValue).replace('円', '')}円/日`
      : formatYen(headlineValue)

  const endDate = policy.maturityDate ?? policy.renewalDate
  const endLabel = policy.maturityDate ? '満期日' : policy.renewalDate ? '更新日' : null

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CategoryIcon category={policy.category} />
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-plane px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                {insuredRelation}
              </span>
              <span className="truncate text-[11px] text-ink-muted">{insuredName}</span>
            </div>
            <h3 className="truncate text-[15px] font-bold text-ink">{policy.productName}</h3>
            <p className="truncate text-xs text-ink-muted">{policy.insurerName}</p>
          </div>
        </div>
        <PolicyStatusBadge status={policy.status} />
      </div>

      {policy.policyNumber && (
        <p className="mt-2 text-[11px] tracking-wide text-ink-muted tabular-nums">
          証券番号 {maskPolicyNumber(policy.policyNumber)}
        </p>
      )}

      <div className="mt-4 rounded-xl bg-plane px-3.5 py-3">
        <p className="text-[11px] font-semibold text-ink-muted">{meta.headlineLabel}</p>
        <p className="text-lg font-bold text-ink tabular-nums">{headlineText}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
        <div>
          <p className="text-ink-muted">保険料</p>
          <p className="font-semibold text-ink tabular-nums">
            {formatYen(policy.premiumAmount)} / {PREMIUM_FREQUENCY_LABEL[policy.premiumFrequency]}
          </p>
        </div>
        <div>
          <p className="text-ink-muted">契約開始日</p>
          <p className="font-semibold text-ink tabular-nums">{formatDate(policy.startDate)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-ink-muted">{endLabel ?? '保障期間'}</p>
          <p className="font-semibold text-ink tabular-nums">{endDate ? formatDate(endDate) : '終身(期限なし)'}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5">
        <Link
          to={`/policies/${policy.id}`}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand-700 px-3 py-2 text-xs font-bold text-white hover:bg-brand-800"
        >
          詳細を見る
          <ChevronRight size={14} />
        </Link>
        <Link
          to={`/policies/${policy.id}/edit`}
          className="flex items-center justify-center gap-1 rounded-xl border border-line px-3 py-2 text-xs font-bold text-ink-secondary hover:bg-plane"
          aria-label="編集"
        >
          <Pencil size={14} />
          編集
        </Link>
      </div>
    </div>
  )
}

export function relationLabelOf(relation: string): string {
  return RELATION_LABEL[relation as keyof typeof RELATION_LABEL] ?? relation
}
