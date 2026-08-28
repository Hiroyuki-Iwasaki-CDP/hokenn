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
  | 'pension'
  | 'other'

// 契約状態
export type PolicyStatus = 'active' | 'lapsed' | 'cancelled' | 'matured'

// 払込頻度
export type PremiumFrequency = 'monthly' | 'yearly' | 'single'

// 保険証券に記載された金額の通貨
export type Currency = 'JPY' | 'USD'

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

  currency: Currency

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

  currency: Currency

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
  isOperator: boolean
}

export interface AdvisorClient {
  id: string
  email: string
  displayName: string | null
  onboarded: boolean
  lineLinked: boolean
  invitedAt: string
  policySharingEnabled: boolean
  policySharingGrantedAt: string | null
}

export interface PendingClientInvitation {
  id: string
  email: string
  invitationType: 'registration' | 'transfer'
  expiresAt: string
  createdAt: string
}

export interface AdvisorConsultation {
  id: string
  customerId: string
  email: string
  displayName: string | null
  requestedAt: string
}

export type ConsultationTopic = 'review' | 'renewal' | 'family' | 'premium' | 'other'
export type ConsultationAppointmentStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled'

export interface ConsultationAppointment {
  id: string
  topic: ConsultationTopic
  firstChoiceAt: string
  secondChoiceAt: string | null
  confirmedStartAt: string | null
  status: ConsultationAppointmentStatus
  requestedAt: string
  confirmedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
}

export interface AdvisorAppointment extends ConsultationAppointment {
  customerId: string
  email: string
  displayName: string | null
}

export type LineNotificationEvent = 'appointment_requested' | 'appointment_rescheduled' | 'customer_cancelled' | 'advisor_confirmed' | 'advisor_cancelled'
export type LineNotificationDeliveryStatus = 'failed' | 'not_linked'

export interface LineNotificationDelivery {
  id: string
  customerId: string
  customerName: string | null
  customerEmail: string
  event: LineNotificationEvent
  recipientRole: 'customer' | 'advisor'
  status: LineNotificationDeliveryStatus
  responseStatus: number | null
  attemptedAt: string
}

export interface AuditLogEntry {
  id: string
  action: string
  resourceType: string
  createdAt: string
}

export type ProductCategory = 'life' | 'medical' | 'pension' | 'auto' | 'home' | 'accident' | 'business'

export interface InsuranceProduct {
  id: string
  category: ProductCategory
  insurerName: string
  productName: string
  summary: string
  officialUrl: string | null
  isPublished: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface PolicySharingStatus {
  available: boolean
  enabled: boolean
  scope: 'full' | null
  grantedAt: string | null
}
