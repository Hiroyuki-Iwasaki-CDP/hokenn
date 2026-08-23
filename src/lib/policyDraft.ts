import type { InsurancePolicy, PolicyInput, Rider, RiderInput } from '../types/insurance'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function createEmptyDraft(): PolicyInput {
  return {
    insuredPersonName: '',
    contractorName: '',
    beneficiary: '',
    category: 'medical',
    insuranceCompany: '',
    productName: '',
    mainContractName: '',
    policyNumber: '',
    riders: [],

    currency: 'JPY',

    coverageAmount: undefined,
    hospitalizationDaily: undefined,
    surgeryBenefit: undefined,
    diagnosisBenefit: undefined,

    premiumAmount: 0,
    premiumFrequency: 'monthly',

    coverageSummary: '',
    contractDate: todayIso(),
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

    attachmentNames: [],

    status: 'active',
    memo: '',
  }
}

function riderToInput(r: Rider): RiderInput {
  return { name: r.name, active: r.active, amount: r.amount ?? undefined, note: r.note ?? '' }
}

export function draftFromPolicy(policy: InsurancePolicy): PolicyInput {
  return {
    insuredPersonName: policy.insuredPersonName,
    contractorName: policy.contractorName ?? '',
    beneficiary: policy.beneficiary ?? '',
    category: policy.category,
    insuranceCompany: policy.insuranceCompany,
    productName: policy.productName,
    mainContractName: policy.mainContractName ?? '',
    policyNumber: policy.policyNumber ?? '',
    riders: policy.riders.map(riderToInput),

    currency: policy.currency,

    coverageAmount: policy.coverageAmount ?? undefined,
    hospitalizationDaily: policy.hospitalizationDaily ?? undefined,
    surgeryBenefit: policy.surgeryBenefit ?? undefined,
    diagnosisBenefit: policy.diagnosisBenefit ?? undefined,

    premiumAmount: policy.premiumAmount,
    premiumFrequency: policy.premiumFrequency,

    coverageSummary: policy.coverageSummary ?? '',
    contractDate: policy.contractDate ?? '',
    contractType: policy.contractType ?? 'wholelife',
    renewalDate: policy.renewalDate ?? '',
    maturityDate: policy.maturityDate ?? '',
    coverageEndAge: policy.coverageEndAge ?? undefined,
    premiumEndDate: policy.premiumEndDate ?? '',
    premiumEndAge: policy.premiumEndAge ?? undefined,

    hasCashValue: policy.hasCashValue,
    cashValueNote: policy.cashValueNote ?? '',

    agentName: policy.agentName ?? '',
    contactInfo: policy.contactInfo ?? '',

    attachmentNames: [...policy.attachmentNames],

    status: policy.status,
    memo: policy.memo ?? '',
  }
}

export function newRider(): RiderInput {
  return { name: '', active: true, amount: undefined, note: '' }
}
