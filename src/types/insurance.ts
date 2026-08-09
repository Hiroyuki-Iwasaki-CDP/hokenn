// 保障分野(カテゴリー)
export type CategoryId =
  | 'death'
  | 'medical'
  | 'cancer'
  | 'disability'
  | 'nursingCare'
  | 'injury'
  | 'auto'
  | 'fire'
  | 'liability'
  | 'education'
  | 'other'

// 契約状態
export type PolicyStatus = 'active' | 'lapsed' | 'cancelled' | 'matured'

export interface InsurancePolicy {
  id: string
  insuredPersonName: string
  category: CategoryId
  insuranceCompany: string
  productName: string
  policyNumber: string | null
  monthlyPremium: number
  coverageSummary: string | null
  contractDate: string | null
  renewalDate: string | null
  status: PolicyStatus
  memo: string | null
  createdAt: string
  updatedAt: string
}

export interface PolicyInput {
  insuredPersonName: string
  category: CategoryId
  insuranceCompany: string
  productName: string
  policyNumber: string
  monthlyPremium: number
  coverageSummary: string
  contractDate: string
  renewalDate: string
  status: PolicyStatus
  memo: string
}

export interface AdvisorProfile {
  advisorName: string | null
  agencyName: string | null
  title: string | null
  phone: string | null
  email: string | null
  officialLineUrl: string | null
  contactHours: string | null
  isAcceptingInquiries: boolean
}

export type ManageScope = 'self' | 'family'

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  manageScope: ManageScope | null
}
