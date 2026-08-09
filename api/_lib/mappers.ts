import type { PolicyInputPayload, AdvisorProfilePayload } from './validation'

// DBの snake_case 行 <-> フロントエンドの camelCase の変換。
// owner_user_id はレスポンスに含めない(クライアントに所有者IDの概念を持たせない)。

export interface PolicyRow {
  id: string
  insured_person_name: string
  category: string
  insurance_company: string
  product_name: string
  policy_number: string | null
  monthly_premium: number
  coverage_summary: string | null
  contract_date: string | null
  renewal_date: string | null
  status: string
  memo: string | null
  created_at: string
  updated_at: string
}

export function policyRowToApi(row: PolicyRow) {
  return {
    id: row.id,
    insuredPersonName: row.insured_person_name,
    category: row.category,
    insuranceCompany: row.insurance_company,
    productName: row.product_name,
    policyNumber: row.policy_number,
    monthlyPremium: Number(row.monthly_premium),
    coverageSummary: row.coverage_summary,
    contractDate: row.contract_date,
    renewalDate: row.renewal_date,
    status: row.status,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function policyInputToRow(input: PolicyInputPayload) {
  return {
    insured_person_name: input.insuredPersonName,
    category: input.category,
    insurance_company: input.insuranceCompany,
    product_name: input.productName,
    policy_number: input.policyNumber?.trim() || null,
    monthly_premium: input.monthlyPremium,
    coverage_summary: input.coverageSummary?.trim() || null,
    contract_date: input.contractDate || null,
    renewal_date: input.renewalDate || null,
    status: input.status,
    memo: input.memo?.trim() || null,
  }
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
