import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, methodNotAllowed, sendJson, withErrorHandling } from '../../_lib/http.js'
import { requireCustomerSession } from '../../_lib/session.js'
import { createSupabaseAdminClient } from '../../_lib/supabaseServer.js'
import { familyMemberQuerySchema } from '../../_lib/validation.js'

const SAFE_POLICY_SELECT = [
  'id',
  'insured_person_name',
  'category',
  'insurance_company',
  'product_name',
  'main_contract_name',
  'currency',
  'coverage_amount',
  'hospitalization_daily',
  'surgery_benefit',
  'diagnosis_benefit',
  'premium_amount',
  'premium_frequency',
  'contract_date',
  'contract_type',
  'renewal_date',
  'maturity_date',
  'coverage_end_age',
  'premium_end_date',
  'premium_end_age',
  'status',
].join(',')

interface SafePolicyRow {
  id: string
  insured_person_name: string
  category: string
  insurance_company: string
  product_name: string
  main_contract_name: string | null
  currency: string
  coverage_amount: number | null
  hospitalization_daily: number | null
  surgery_benefit: number | null
  diagnosis_benefit: number | null
  premium_amount: number
  premium_frequency: string
  contract_date: string | null
  contract_type: string | null
  renewal_date: string | null
  maturity_date: string | null
  coverage_end_age: number | null
  premium_end_date: string | null
  premium_end_age: number | null
  status: string
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
  const session = await requireCustomerSession(req, res)
  const { memberId } = familyMemberQuerySchema.parse({ memberId: req.query.memberId })
  if (memberId === session.userId) throw new HttpError(400, '自分の保険情報は保険一覧から確認してください。')

  const admin = createSupabaseAdminClient()
  const [memberA, memberB] = [session.userId, memberId].sort()
  const { data: connection, error: connectionError } = await admin
    .from('family_connections')
    .select('id')
    .eq('member_a_user_id', memberA)
    .eq('member_b_user_id', memberB)
    .is('revoked_at', null)
    .maybeSingle()
  if (connectionError || !connection) throw new HttpError(403, 'この方の保険情報を閲覧する権限がありません。')

  const [{ data: member, error: memberError }, { data: policies, error: policyError }] = await Promise.all([
    admin
      .from('users')
      .select('display_name')
      .eq('id', memberId)
      .eq('role', 'customer')
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle(),
    admin
      .from('insurance_policies')
      .select(SAFE_POLICY_SELECT)
      .eq('owner_user_id', memberId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
  ])
  if (memberError || !member || policyError) throw new HttpError(500, '家族の保険情報を読み込めませんでした。')

  sendJson(res, 200, {
    member: { id: memberId, displayName: member.display_name },
    policies: ((policies ?? []) as unknown as SafePolicyRow[]).map((row) => ({
      id: row.id,
      insuredPersonName: row.insured_person_name,
      category: row.category,
      insuranceCompany: row.insurance_company,
      productName: row.product_name,
      mainContractName: row.main_contract_name,
      currency: row.currency,
      coverageAmount: row.coverage_amount === null ? null : Number(row.coverage_amount),
      hospitalizationDaily: row.hospitalization_daily === null ? null : Number(row.hospitalization_daily),
      surgeryBenefit: row.surgery_benefit === null ? null : Number(row.surgery_benefit),
      diagnosisBenefit: row.diagnosis_benefit === null ? null : Number(row.diagnosis_benefit),
      premiumAmount: Number(row.premium_amount),
      premiumFrequency: row.premium_frequency,
      contractDate: row.contract_date,
      contractType: row.contract_type,
      renewalDate: row.renewal_date,
      maturityDate: row.maturity_date,
      coverageEndAge: row.coverage_end_age,
      premiumEndDate: row.premium_end_date,
      premiumEndAge: row.premium_end_age,
      status: row.status,
    })),
  })
}

export default withErrorHandling(handler)
