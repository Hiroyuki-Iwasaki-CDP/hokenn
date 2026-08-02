import type { InsurancePolicy } from '../types/insurance'
import { daysUntil } from './format'

// 保険料を年間換算する(月払は12倍、一時払は初年度のみ計上せず0として除外)
export function toAnnualPremium(policy: Pick<InsurancePolicy, 'premiumAmount' | 'premiumFrequency'>): number {
  switch (policy.premiumFrequency) {
    case 'monthly':
      return policy.premiumAmount * 12
    case 'yearly':
      return policy.premiumAmount
    case 'single':
      return 0
    default:
      return 0
  }
}

export function toMonthlyPremium(policy: Pick<InsurancePolicy, 'premiumAmount' | 'premiumFrequency'>): number {
  switch (policy.premiumFrequency) {
    case 'monthly':
      return policy.premiumAmount
    case 'yearly':
      return policy.premiumAmount / 12
    case 'single':
      return 0
    default:
      return 0
  }
}

export function sumMonthlyPremium(policies: InsurancePolicy[]): number {
  return policies.reduce((sum, p) => sum + toMonthlyPremium(p), 0)
}

export function sumAnnualPremium(policies: InsurancePolicy[]): number {
  return policies.reduce((sum, p) => sum + toAnnualPremium(p), 0)
}

// 次の更新日・満期日のうち近い方を返す
export function nextMilestoneDate(policy: InsurancePolicy): { date: string; kind: 'renewal' | 'maturity' } | null {
  const candidates: { date: string; kind: 'renewal' | 'maturity' }[] = []
  if (policy.renewalDate) candidates.push({ date: policy.renewalDate, kind: 'renewal' })
  if (policy.maturityDate) candidates.push({ date: policy.maturityDate, kind: 'maturity' })
  if (candidates.length === 0) return null
  return candidates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
}

export interface UpcomingItem {
  policy: InsurancePolicy
  date: string
  kind: 'renewal' | 'maturity'
  days: number
}

// 更新日・満期日が近い順に契約を並べる(過去日・未設定は除外)
export function sortByUpcoming(policies: InsurancePolicy[], from: Date = new Date()): UpcomingItem[] {
  const items: UpcomingItem[] = []
  for (const policy of policies) {
    const milestone = nextMilestoneDate(policy)
    if (!milestone) continue
    const days = daysUntil(milestone.date, from)
    if (days === null) continue
    items.push({ policy, date: milestone.date, kind: milestone.kind, days })
  }
  return items.sort((a, b) => a.days - b.days)
}

export const RENEWAL_SOON_THRESHOLD_DAYS = 90
