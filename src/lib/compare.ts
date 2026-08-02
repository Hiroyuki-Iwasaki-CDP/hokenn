import type { InsurancePolicy, CategoryId } from '../types/insurance'
import { getCategory } from './categories'

export interface ComparisonItem {
  policy: InsurancePolicy
  amount: number
}

export interface ComparisonGroup {
  category: CategoryId
  headlineLabel: string
  unit: '円' | '円/日'
  total: number
  items: ComparisonItem[]
}

// 同じ被保険者・同じ保障分野の契約をまとめ、保障額を積み上げ比較できる形にする
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
    const meta = getCategory(category)
    const items: ComparisonItem[] = list
      .map((policy) => ({ policy, amount: policy[meta.headline] }))
      .filter((x): x is { policy: InsurancePolicy; amount: number } => typeof x.amount === 'number' && x.amount > 0)
    if (items.length === 0) continue
    groups.push({
      category,
      headlineLabel: meta.headlineLabel,
      unit: meta.headline === 'hospitalizationDaily' ? '円/日' : '円',
      total: items.reduce((sum, i) => sum + i.amount, 0),
      items: items.sort((a, b) => b.amount - a.amount),
    })
  }

  return groups.sort((a, b) => b.items.length - a.items.length || b.total - a.total)
}
