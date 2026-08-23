import type { PolicyInputPayload, AdvisorProfilePayload } from './validation.js'

// DBの snake_case 行 <-> フロントエンドの camelCase の変換。
// owner_user_id はレスポンスに含めない(クライアントに所有者IDの概念を持たせない)。

export interface RiderRow {
  id: string
  name: string
  active: boolean
  amount: number | null
  note: string | null
}

export function riderRowToApi(row: RiderRow) {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    amount: row.amount === null ? null : Number(row.amount),
    note: row.note,
  }
}

export interface PolicyRow {
  id: string
  insured_person_name: string
  contractor_name: string | null
  beneficiary: string | null
  category: string
  insurance_company: string
  product_name: string
  main_contract_name: string | null
  policy_number: string | null
  riders?: RiderRow[]

  currency: string

  coverage_amount: number | null
  hospitalization_daily: number | null
  surgery_benefit: number | null
  diagnosis_benefit: number | null

  premium_amount: number
  premium_frequency: string

  coverage_summary: string | null
  contract_date: string | null
  contract_type: string | null
  renewal_date: string | null
  maturity_date: string | null
  coverage_end_age: number | null
  premium_end_date: string | null
  premium_end_age: number | null

  has_cash_value: boolean
  cash_value_note: string | null

  agent_name: string | null
  contact_info: string | null

  attachment_names: string[]

  status: string
  memo: string | null
  created_at: string
  updated_at: string
}

function toNumberOrNull(v: number | null): number | null {
  return v === null ? null : Number(v)
}

export function policyRowToApi(row: PolicyRow) {
  return {
    id: row.id,
    insuredPersonName: row.insured_person_name,
    contractorName: row.contractor_name,
    beneficiary: row.beneficiary,
    category: row.category,
    insuranceCompany: row.insurance_company,
    productName: row.product_name,
    mainContractName: row.main_contract_name,
    policyNumber: row.policy_number,
    riders: (row.riders ?? []).map(riderRowToApi),

    currency: row.currency,

    coverageAmount: toNumberOrNull(row.coverage_amount),
    hospitalizationDaily: toNumberOrNull(row.hospitalization_daily),
    surgeryBenefit: toNumberOrNull(row.surgery_benefit),
    diagnosisBenefit: toNumberOrNull(row.diagnosis_benefit),

    premiumAmount: Number(row.premium_amount),
    premiumFrequency: row.premium_frequency,

    coverageSummary: row.coverage_summary,
    contractDate: row.contract_date,
    contractType: row.contract_type,
    renewalDate: row.renewal_date,
    maturityDate: row.maturity_date,
    coverageEndAge: row.coverage_end_age,
    premiumEndDate: row.premium_end_date,
    premiumEndAge: row.premium_end_age,

    hasCashValue: row.has_cash_value,
    cashValueNote: row.cash_value_note,

    agentName: row.agent_name,
    contactInfo: row.contact_info,

    attachmentNames: row.attachment_names ?? [],

    status: row.status,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function policyInputToRow(input: PolicyInputPayload) {
  return {
    insured_person_name: input.insuredPersonName,
    contractor_name: input.contractorName?.trim() || null,
    beneficiary: input.beneficiary?.trim() || null,
    category: input.category,
    insurance_company: input.insuranceCompany,
    product_name: input.productName,
    main_contract_name: input.mainContractName?.trim() || null,
    policy_number: input.policyNumber?.trim() || null,

    currency: input.currency,

    coverage_amount: input.coverageAmount ?? null,
    hospitalization_daily: input.hospitalizationDaily ?? null,
    surgery_benefit: input.surgeryBenefit ?? null,
    diagnosis_benefit: input.diagnosisBenefit ?? null,

    premium_amount: input.premiumAmount,
    premium_frequency: input.premiumFrequency,

    coverage_summary: input.coverageSummary?.trim() || null,
    contract_date: input.contractDate || null,
    contract_type: input.contractType ?? null,
    renewal_date: input.renewalDate || null,
    maturity_date: input.maturityDate || null,
    coverage_end_age: input.coverageEndAge ?? null,
    premium_end_date: input.premiumEndDate || null,
    premium_end_age: input.premiumEndAge ?? null,

    has_cash_value: input.hasCashValue ?? false,
    cash_value_note: input.cashValueNote?.trim() || null,

    agent_name: input.agentName?.trim() || null,
    contact_info: input.contactInfo?.trim() || null,

    attachment_names: input.attachmentNames ?? [],

    status: input.status,
    memo: input.memo?.trim() || null,
  }
}

export function riderInputsToRows(input: PolicyInputPayload, policyId: string, ownerUserId: string) {
  return (input.riders ?? []).map((r) => ({
    policy_id: policyId,
    owner_user_id: ownerUserId,
    name: r.name,
    active: r.active,
    amount: r.amount ?? null,
    note: r.note?.trim() || null,
  }))
}

export interface AdvisorRow {
  advisor_name: string | null
  agency_name: string | null
  title: string | null
  phone: string | null
  email: string | null
  official_line_url: string | null
  contact_hours: string | null
  is_accepting_inquiries: boolean
}

export function advisorRowToApi(row: AdvisorRow | null) {
  if (!row) return null
  return {
    advisorName: row.advisor_name,
    agencyName: row.agency_name,
    title: row.title,
    phone: row.phone,
    email: row.email,
    officialLineUrl: row.official_line_url,
    contactHours: row.contact_hours,
    isAcceptingInquiries: row.is_accepting_inquiries,
  }
}

export function advisorInputToRow(input: AdvisorProfilePayload) {
  return {
    advisor_name: input.advisorName?.trim() || null,
    agency_name: input.agencyName?.trim() || null,
    title: input.title?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    official_line_url: input.officialLineUrl?.trim() || null,
    contact_hours: input.contactHours?.trim() || null,
    is_accepting_inquiries: input.isAcceptingInquiries ?? true,
  }
}
