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

// 払込頻度
export type PremiumFrequency = 'monthly' | 'yearly' | 'single'

// 契約タイプ(更新型・終身型など)
export type ContractType = 'renewal' | 'wholelife' | 'termFixed' | 'singlePayment'

export interface Rider {
  id: string
  name: string
  active: boolean
  amount: number | null
  note: string | null
}

export interface RiderInput {
  name: string
  active: boolean
  amount: number | undefined
  note: string
}

export interface InsurancePolicy {
  id: string
  insuredPersonName: string
  contractorName: string | null
  beneficiary: string | null
  category: CategoryId
  insuranceCompany: string
  productName: string
  mainContractName: string | null
  policyNumber: string | null
  riders: Rider[]

  coverageAmount: number | null
  hospitalizationDaily: number | null
  surgeryBenefit: number | null
  diagnosisBenefit: number | null

  premiumAmount: number
  premiumFrequency: PremiumFrequency

  coverageSummary: string | null
  contractDate: string | null
  contractType: ContractType | null
  renewalDate: string | null
  maturityDate: string | null
  coverageEndAge: number | null
  premiumEndDate: string | null
  premiumEndAge: number | null

  hasCashValue: boolean
  cashValueNote: string | null

  agentName: string | null
  contactInfo: string | null

  attachmentNames: string[]

  status: PolicyStatus
  memo: string | null
  createdAt: string
  updatedAt: string
}

export interface PolicyInput {
  insuredPersonName: string
  contractorName: string
  beneficiary: string
  category: CategoryId
  insuranceCompany: string
  productName: string
  mainContractName: string
  policyNumber: string
  riders: RiderInput[]

  coverageAmount: number | undefined
  hospitalizationDaily: number | undefined
  surgeryBenefit: number | undefined
  diagnosisBenefit: number | undefined

  premiumAmount: number
  premiumFrequency: PremiumFrequency

  coverageSummary: string
  contractDate: string
  contractType: ContractType
  renewalDate: string
  maturityDate: string
  coverageEndAge: number | undefined
  premiumEndDate: string
  premiumEndAge: number | undefined

  hasCashValue: boolean
  cashValueNote: string

  agentName: string
  contactInfo: string

  attachmentNames: string[]

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

export type UserRole = 'customer' | 'advisor'

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  manageScope: ManageScope | null
  role: UserRole
  advisorId: string | null
}

export interface AdvisorClient {
  id: string
  email: string
  displayName: string | null
  onboarded: boolean
  invitedAt: string
  policySharingEnabled: boolean
  policySharingGrantedAt: string | null
}

export interface PolicySharingStatus {
  available: boolean
  enabled: boolean
  scope: 'full' | null
  grantedAt: string | null
}
