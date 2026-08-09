import type { InsurancePolicy } from '../types/insurance'
import { daysUntil } from './format'

export function sumMonthlyPremium(policies: InsurancePolicy[]): number {
  return policies.reduce((sum, p) => sum + p.monthlyPremium, 0)
}

export function sumAnnualPremium(policies: InsurancePolicy[]): number {
  return sumMonthlyPremium(policies) * 12
}

export interface UpcomingItem {
  policy: InsurancePolicy
  date: string
  days: number
}

// 更新日が近い順に契約を並べる(過去日・未設定は除外)
export function sortByUpcoming(policies: InsurancePolicy[], from: Date = new Date()): UpcomingItem[] {
  const items: UpcomingItem[] = []
  for (const policy of policies) {
    if (!policy.renewalDate) continue
    const days = daysUntil(policy.renewalDate, from)
    if (days === null) continue
    items.push({ policy, date: policy.renewalDate, days })
  }
  return items.sort((a, b) => a.days - b.days)
}

export const RENEWAL_SOON_THRESHOLD_DAYS = 90
