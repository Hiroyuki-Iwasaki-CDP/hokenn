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
  'other',
] as const

const POLICY_STATUSES = ['active', 'lapsed', 'cancelled', 'matured'] as const

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

export const policyInputSchema = z.object({
  insuredPersonName: z.string().trim().min(1, '保険の対象者を入力してください。').max(100),
  category: z.enum(CATEGORY_IDS),
  insuranceCompany: z.string().trim().min(1, '保険会社を入力してください。').max(100),
  productName: z.string().trim().min(1, '商品名を入力してください。').max(150),
  policyNumber: z.string().trim().max(50).optional().nullable(),
  monthlyPremium: z
    .number()
    .finite()
    .min(0, '月額保険料は0以上で入力してください。')
    .max(10_000_000, '月額保険料の値が大きすぎます。'),
  coverageSummary: z.string().trim().max(500).optional().nullable(),
  contractDate: isoDate.optional().nullable(),
  renewalDate: isoDate.optional().nullable(),
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
