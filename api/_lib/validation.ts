import { z } from 'zod'

const CATEGORY_IDS = [
  'death',
  'medical',
  'cancer',
  'disability',
  'nursingCare',
  'injury',
  'auto',
  'fire',
  'liability',
  'education',
  'pension',
  'other',
] as const

const POLICY_STATUSES = ['active', 'lapsed', 'cancelled', 'matured'] as const
const PREMIUM_FREQUENCIES = ['monthly', 'yearly', 'single'] as const
const CONTRACT_TYPES = ['renewal', 'wholelife', 'termFixed', 'singlePayment'] as const
const CURRENCIES = ['JPY', 'USD'] as const

// 空文字列も許容する(mappers.tsのpolicyInputToRowが `input.contractDate || null` で
// 空文字列をnullへ正規化する前提のため、ここで弾くとクライアントとの契約が崩れる)。
const isoDate = z
  .string()
  .trim()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, '日付の形式が正しくありません。')

export const emailSchema = z.string().trim().toLowerCase().email('メールアドレスの形式が正しくありません。').max(254)

export const requestCodeSchema = z.object({
  email: emailSchema,
})

export const verifyCodeSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, '認証コードは6桁の数字で入力してください。'),
})

export const inviteClientSchema = z.object({
  email: emailSchema,
})

export const revokeClientInvitationSchema = z.object({
  id: z.string().uuid('招待情報が正しくありません。'),
})

export const operatorAdvisorInviteSchema = z.object({ email: emailSchema }).strict()

export const operatorAdvisorStatusSchema = z.object({
  id: z.string().uuid('担当者情報が正しくありません。'),
  active: z.boolean(),
}).strict()

export const acceptInvitationSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{43}$/, '招待リンクが正しくありません。'),
})

export const policySharingUpdateSchema = z.discriminatedUnion('enabled', [
  z.object({
    enabled: z.literal(true),
    confirmation: z.literal(true, { message: '共有内容を確認して同意してください。' }),
  }),
  z.object({
    enabled: z.literal(false),
  }),
])

const optionalAmount = z
  .number()
  .finite()
  .min(0, '0以上の金額を入力してください。')
  .max(1_000_000_000, '金額の値が大きすぎます。')
  .optional()
  .nullable()

const optionalAge = z.number().int().min(0).max(150).optional().nullable()

const riderInputSchema = z.object({
  name: z.string().trim().min(1, '特約名を入力してください。').max(100),
  active: z.boolean(),
  amount: optionalAmount,
  note: z.string().trim().max(300).optional().nullable(),
})

export const policyInputSchema = z.object({
  insuredPersonName: z.string().trim().min(1, '保険の対象者を入力してください。').max(100),
  contractorName: z.string().trim().max(100).optional().nullable(),
  beneficiary: z.string().trim().max(100).optional().nullable(),
  category: z.enum(CATEGORY_IDS),
  insuranceCompany: z.string().trim().min(1, '保険会社を入力してください。').max(100),
  productName: z.string().trim().min(1, '商品名を入力してください。').max(150),
  mainContractName: z.string().trim().max(150).optional().nullable(),
  policyNumber: z.string().trim().max(50).optional().nullable(),
  riders: z.array(riderInputSchema).max(20, '特約は20件までです。').optional().default([]),

  currency: z.enum(CURRENCIES),

  coverageAmount: optionalAmount,
  hospitalizationDaily: optionalAmount,
  surgeryBenefit: optionalAmount,
  diagnosisBenefit: optionalAmount,

  premiumAmount: z
    .number()
    .finite()
    .min(0, '保険料は0以上で入力してください。')
    .max(10_000_000, '保険料の値が大きすぎます。'),
  premiumFrequency: z.enum(PREMIUM_FREQUENCIES),

  coverageSummary: z.string().trim().max(500).optional().nullable(),
  contractDate: isoDate.optional().nullable(),
  contractType: z.enum(CONTRACT_TYPES).optional().nullable(),
  renewalDate: isoDate.optional().nullable(),
  maturityDate: isoDate.optional().nullable(),
  coverageEndAge: optionalAge,
  premiumEndDate: isoDate.optional().nullable(),
  premiumEndAge: optionalAge,

  hasCashValue: z.boolean().optional().default(false),
  cashValueNote: z.string().trim().max(500).optional().nullable(),

  agentName: z.string().trim().max(100).optional().nullable(),
  contactInfo: z.string().trim().max(200).optional().nullable(),

  attachmentNames: z
    .array(z.string().trim().min(1).max(200))
    .max(20, '書類名メモは20件までです。')
    .optional()
    .default([]),

  status: z.enum(POLICY_STATUSES),
  memo: z.string().trim().max(1000).optional().nullable(),
})

export const advisorProfileSchema = z.object({
  advisorName: z.string().trim().max(100).optional().nullable(),
  agencyName: z.string().trim().max(100).optional().nullable(),
  title: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email('メールアドレスの形式が正しくありません。').max(254).optional().nullable().or(z.literal('')),
  officialLineUrl: z
    .string()
    .trim()
    .url('URLの形式が正しくありません。')
    .max(500)
    .refine((v) => /^https:\/\//.test(v), 'URLは https:// で始まる必要があります。')
    .optional()
    .nullable()
    .or(z.literal('')),
  contactHours: z.string().trim().max(100).optional().nullable(),
  isAcceptingInquiries: z.boolean().optional().default(true),
})

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, '表示名を入力してください。').max(100),
  manageScope: z.enum(['self', 'family']).optional(),
  termsAccepted: z.literal(true, { message: '利用規約への同意が必要です。' }),
  sensitiveInfoAcknowledged: z.literal(true, { message: '機密情報を登録しないことへの確認が必要です。' }),
})

export type PolicyInputPayload = z.infer<typeof policyInputSchema>
export type AdvisorProfilePayload = z.infer<typeof advisorProfileSchema>
export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>
