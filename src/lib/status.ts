import type { PolicyStatus, PremiumFrequency, ContractType, RelationId } from '../types/insurance'

export const STATUS_META: Record<PolicyStatus, { label: string; tone: 'good' | 'muted' | 'warning' }> = {
  active: { label: '有効', tone: 'good' },
  lapsed: { label: '失効', tone: 'warning' },
  cancelled: { label: '解約', tone: 'muted' },
  matured: { label: '満期', tone: 'muted' },
}

export const PREMIUM_FREQUENCY_LABEL: Record<PremiumFrequency, string> = {
  monthly: '月払い',
  yearly: '年払い',
  single: '一時払い',
}

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  renewal: '更新型',
  wholelife: '終身型',
  termFixed: '定期型',
  singlePayment: '一時払い型',
}

export const RELATION_LABEL: Record<RelationId, string> = {
  self: 'わたし',
  spouse: '配偶者',
  child: '子ども',
  other: '家族全員',
}
