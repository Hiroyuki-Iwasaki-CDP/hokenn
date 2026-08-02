import type { FamilyMember, InsurancePolicy, Rider } from '../types/insurance'

export type PolicyDraft = Omit<
  InsurancePolicy,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'policyNumber'
  | 'renewalDate'
  | 'maturityDate'
  | 'premiumEndDate'
  | 'beneficiary'
  | 'agentName'
  | 'contactInfo'
  | 'memo'
  | 'cashValueNote'
> & {
  policyNumber: string
  renewalDate: string
  maturityDate: string
  premiumEndDate: string
  beneficiary: string
  agentName: string
  contactInfo: string
  memo: string
  cashValueNote: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function createEmptyDraft(family: FamilyMember[]): PolicyDraft {
  return {
    status: 'active',
    category: 'medical',
    contractorName: family.find((m) => m.relation === 'self')?.name ?? '',
    insuredMemberId: family.find((m) => m.relation === 'self')?.id ?? family[0]?.id ?? '',
    beneficiary: '',
    insurerName: '',
    productName: '',
    policyNumber: '',
    mainContractName: '',
    riders: [],
    coverageAmount: undefined,
    hospitalizationDaily: undefined,
    surgeryBenefit: undefined,
    diagnosisBenefit: undefined,
    premiumAmount: 0,
    premiumFrequency: 'monthly',
    startDate: todayIso(),
    contractType: 'wholelife',
    renewalDate: '',
    maturityDate: '',
    coverageEndAge: undefined,
    premiumEndDate: '',
    premiumEndAge: undefined,
    hasCashValue: false,
    cashValueNote: '',
    agentName: '',
    contactInfo: '',
    memo: '',
    attachmentNames: [],
  }
}

export function draftFromPolicy(policy: InsurancePolicy): PolicyDraft {
  return {
    ...policy,
    policyNumber: policy.policyNumber ?? '',
    renewalDate: policy.renewalDate ?? '',
    maturityDate: policy.maturityDate ?? '',
    premiumEndDate: policy.premiumEndDate ?? '',
    beneficiary: policy.beneficiary ?? '',
    agentName: policy.agentName ?? '',
    contactInfo: policy.contactInfo ?? '',
    memo: policy.memo ?? '',
    cashValueNote: policy.cashValueNote ?? '',
    riders: policy.riders.map((r) => ({ ...r })),
  }
}

export function draftToPolicyInput(draft: PolicyDraft): Omit<InsurancePolicy, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ...draft,
    policyNumber: draft.policyNumber.trim() || undefined,
    renewalDate: draft.renewalDate || undefined,
    maturityDate: draft.maturityDate || undefined,
    premiumEndDate: draft.premiumEndDate || undefined,
    beneficiary: draft.beneficiary.trim() || undefined,
    agentName: draft.agentName.trim() || undefined,
    contactInfo: draft.contactInfo.trim() || undefined,
    memo: draft.memo.trim() || undefined,
    cashValueNote: draft.cashValueNote.trim() || undefined,
  }
}

export function newRider(): Rider {
  return { id: `rider-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '', active: true }
}
