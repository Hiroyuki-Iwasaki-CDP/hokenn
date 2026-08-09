import type { InsurancePolicy, CategoryId } from '../types/insurance'
import { getCategory } from './categories'

export interface ComparisonItem {
  policy: InsurancePolicy
  amount: number
}

export interface ComparisonGroup {
  category: CategoryId
  headlineLabel: string
  total: number
  items: ComparisonItem[]
}

// 同じ被保険者・同じ保障分野の契約をまとめ、月額保険料の内訳を比較できる形にする。
// (β版の簡素化されたデータモデルには保障額の内訳が無いため、月額保険料で比較する)
export function buildComparisonGroups(policies: InsurancePolicy[]): ComparisonGroup[] {
  const byCategory = new Map<CategoryId, InsurancePolicy[]>()
  for (const policy of policies) {
    if (policy.status !== 'active') continue
    const list = byCategory.get(policy.category) ?? []
    list.push(policy)
    byCategory.set(policy.category, list)
  }

  const groups: ComparisonGroup[] = []
  for (const [category, list] of byCategory) {
    if (list.length < 2) continue
    const items: ComparisonItem[] = list
      .filter((p) => p.monthlyPremium > 0)
      .map((policy) => ({ policy, amount: policy.monthlyPremium }))
    if (items.length === 0) continue
    groups.push({
      category,
      headlineLabel: `${getCategory(category).label}の月額保険料`,
      total: items.reduce((sum, i) => sum + i.amount, 0),
      items: items.sort((a, b) => b.amount - a.amount),
    })
  }

  return groups.sort((a, b) => b.items.length - a.items.length || b.total - a.total)
}
