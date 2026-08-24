import type { CategoryId, InsurancePolicy } from '../types/insurance'
import { CATEGORY_ORDER, getCategory } from './categories'

export interface ConsultationInsight {
  kind: 'incomplete' | 'renewal' | 'overlap' | 'unregistered'
  title: string
  description: string
}

export function registeredActiveCategories(policies: InsurancePolicy[]): Set<CategoryId> {
  return new Set(policies.filter((policy) => policy.status === 'active').map((policy) => policy.category))
}

export function buildConsultationInsights(policies: InsurancePolicy[]): ConsultationInsight[] {
  const active = policies.filter((policy) => policy.status === 'active')
  const insights: ConsultationInsight[] = []

  const incomplete = active.filter((policy) => {
    const meta = getCategory(policy.category)
    return typeof policy[meta.headline] !== 'number' || policy[meta.headline] === null
  })
  if (incomplete.length > 0) {
    insights.push({
      kind: 'incomplete',
      title: `保障額を確認したい保険が${incomplete.length}件あります`,
      description: '保険証券を見ながら保障額を追加入力すると、比較しやすくなります。',
    })
  }

  const oneYearFromNow = Date.now() + 365 * 24 * 60 * 60 * 1000
  const upcoming = active.filter((policy) => {
    const date = policy.renewalDate ?? policy.maturityDate
    if (!date) return false
    const time = new Date(`${date}T00:00:00`).getTime()
    return Number.isFinite(time) && time >= Date.now() && time <= oneYearFromNow
  })
  if (upcoming.length > 0) {
    insights.push({
      kind: 'renewal',
      title: `1年以内に更新・満期を迎える保険が${upcoming.length}件あります`,
      description: '更新日や満期日、更新後の保険料を担当者と確認する目安にできます。',
    })
  }

  const grouped = new Map<string, number>()
  for (const policy of active) {
    const key = `${policy.insuredPersonName}\u0000${policy.category}`
    grouped.set(key, (grouped.get(key) ?? 0) + 1)
  }
  const overlapCount = [...grouped.values()].filter((count) => count >= 2).length
  if (overlapCount > 0) {
    insights.push({
      kind: 'overlap',
      title: `同じ対象者・保障分野で複数契約がある組み合わせが${overlapCount}件あります`,
      description: '重複が問題とは限りません。保障範囲や支払条件の違いを確認する候補です。',
    })
  }

  const registered = registeredActiveCategories(active)
  const unregistered = CATEGORY_ORDER.filter((category) => category !== 'other' && !registered.has(category))
  if (unregistered.length > 0) {
    insights.push({
      kind: 'unregistered',
      title: `登録がない保障分野が${unregistered.length}種類あります`,
      description: '未登録は不足を意味しません。公的保障や貯蓄を含め、確認する分野を選ぶための一覧です。',
    })
  }

  return insights
}
