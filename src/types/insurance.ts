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

// 家族の続柄
export type RelationId = 'self' | 'spouse' | 'child' | 'other'

export interface FamilyMember {
  id: string
  name: string
  relation: RelationId
  birthYear?: number
}

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
  amount?: number
  note?: string
}

export interface InsurancePolicy {
  id: string
  status: PolicyStatus
  category: CategoryId

  // 契約者・被保険者・受取人
  contractorName: string
  insuredMemberId: string
  beneficiary?: string

  // 保険会社・商品
  insurerName: string
  productName: string
  policyNumber?: string

  // 主契約・特約
  mainContractName: string
  riders: Rider[]

  // 保障額・給付額
  coverageAmount?: number // 主な保障額(死亡保険金・建物保険金額・賠償限度額 等)
  hospitalizationDaily?: number // 入院日額
  surgeryBenefit?: number // 手術給付金
  diagnosisBenefit?: number // 診断給付金

  // 保険料
  premiumAmount: number
  premiumFrequency: PremiumFrequency

  // 契約期間
  startDate: string // ISO date
  contractType: ContractType
  renewalDate?: string // 更新日
  maturityDate?: string // 満期日
  coverageEndAge?: number // 保障終了年齢

  // 払込期間
  premiumEndDate?: string
  premiumEndAge?: number

  // 貯蓄性
  hasCashValue: boolean
  cashValueNote?: string

  // 連絡先
  agentName?: string
  contactInfo?: string

  memo?: string
  attachmentNames: string[]

  createdAt: string
  updatedAt: string
}
