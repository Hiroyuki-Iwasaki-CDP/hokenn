import type { FamilyMember, InsurancePolicy } from '../types/insurance'

export const ALL_FAMILY_ID = 'all'

// 「全員」または対象の被保険者、あるいは家族全員向け契約(insuredMemberId: 'family')に一致する契約を抽出する
export function filterPoliciesByFamily(policies: InsurancePolicy[], selectedId: string): InsurancePolicy[] {
  if (selectedId === ALL_FAMILY_ID) return policies
  return policies.filter((p) => p.insuredMemberId === selectedId || p.insuredMemberId === 'family')
}

export function selectableFamilyTabs(family: FamilyMember[]): FamilyMember[] {
  return family.filter((m) => m.relation !== 'other')
}
