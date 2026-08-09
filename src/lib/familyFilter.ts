import type { InsurancePolicy } from '../types/insurance'

export const ALL_FAMILY_ID = 'all'

// 保険の対象者(insuredPersonName)ごとにタブを切り替える。専用のFamilyMemberテーブルは持たず、
// 登録済みの契約から対象者名を動的に抽出する(初回登場順)。
export function listInsuredPersons(policies: InsurancePolicy[]): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const p of policies) {
    if (!seen.has(p.insuredPersonName)) {
      seen.add(p.insuredPersonName)
      names.push(p.insuredPersonName)
    }
  }
  return names
}

export function filterPoliciesByFamily(policies: InsurancePolicy[], selected: string): InsurancePolicy[] {
  if (selected === ALL_FAMILY_ID) return policies
  return policies.filter((p) => p.insuredPersonName === selected)
}
