import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../_lib/http.js'
import { requireSessionUser } from '../_lib/session.js'
import { writeAuditLog } from '../_lib/audit.js'

const topicSchema = z.enum(['review', 'renewal', 'family', 'premium', 'other'])
const createSchema = z.object({
  topic: topicSchema,
  firstChoiceAt: z.string().datetime({ offset: true }),
  secondChoiceAt: z.string().datetime({ offset: true }).nullable(),
}).strict()
const cancelSchema = z.object({ id: z.string().uuid(), status: z.literal('cancelled') }).strict()

const SELECT_COLUMNS =
  'id, topic, first_choice_at, second_choice_at, confirmed_start_at, status, requested_at, confirmed_at, completed_at, cancelled_at'

function toResponse(row: Record<string, unknown>) {
  return {
    id: row.id,
    topic: row.topic,
    firstChoiceAt: row.first_choice_at,
    secondChoiceAt: row.second_choice_at,
    confirmedStartAt: row.confirmed_start_at,
    status: row.status,
    requestedAt: row.requested_at,
    confirmedAt: row.confirmed_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
  }
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSessionUser(req, res)
  const { data: customer, error: customerError } = await session.supabase
    .from('users')
    .select('role, advisor_id')
    .eq('id', session.userId)
    .maybeSingle()
  if (customerError) throw new HttpError(500, '利用者情報を確認できませんでした。')
  if (customer?.role !== 'customer') throw new HttpError(403, 'この操作は契約者アカウントでのみ行えます。')

  if (req.method === 'GET') {
    const { data, error } = await session.supabase
      .from('consultation_appointments')
      .select(SELECT_COLUMNS)
      .eq('customer_user_id', session.userId)
      .order('requested_at', { ascending: false })
      .limit(10)
    if (error) throw new HttpError(500, '相談申込みを読み込めませんでした。')
    sendJson(res, 200, { appointments: (data ?? []).map(toResponse) })
    return
  }

  if (req.method === 'POST') {
    assertTrustedOrigin(req)
    if (!customer.advisor_id) throw new HttpError(400, '担当代理店が設定されていないため、相談を申し込めません。')
    const input = createSchema.parse(await readJsonBody(req))
    const first = new Date(input.firstChoiceAt)
    const second = input.secondChoiceAt ? new Date(input.secondChoiceAt) : null
    const earliest = Date.now() + 30 * 60 * 1000
    const latest = Date.now() + 90 * 24 * 60 * 60 * 1000
    if (first.getTime() < earliest || first.getTime() > latest) {
      throw new HttpError(400, '第1希望は30分後から90日以内で選択してください。')
    }
    if (second && (second.getTime() < earliest || second.getTime() > latest)) {
      throw new HttpError(400, '第2希望は30分後から90日以内で選択してください。')
    }
    if (second && second.getTime() === first.getTime()) {
      throw new HttpError(400, '第2希望は第1希望と異なる日時を選択してください。')
    }

    const { data, error } = await session.supabase
      .from('consultation_appointments')
      .insert({
        customer_user_id: session.userId,
        advisor_user_id: customer.advisor_id,
        topic: input.topic,
        first_choice_at: first.toISOString(),
        second_choice_at: second?.toISOString() ?? null,
      })
      .select(SELECT_COLUMNS)
      .single()
    if (error?.code === '23505') {
      throw new HttpError(409, '対応中の相談申込みがあります。日時変更は担当者へご連絡ください。')
    }
    if (error) throw new HttpError(500, '相談を申し込めませんでした。')
    await writeAuditLog(session.supabase, session.userId, 'consultation_appointment_requested', 'advisor', customer.advisor_id)
    sendJson(res, 201, { appointment: toResponse(data) })
    return
  }

  if (req.method === 'PATCH') {
    assertTrustedOrigin(req)
    const input = cancelSchema.parse(await readJsonBody(req))
    const now = new Date().toISOString()
    const { data, error } = await session.supabase
      .from('consultation_appointments')
      .update({ status: 'cancelled', cancelled_at: now })
      .eq('id', input.id)
      .eq('customer_user_id', session.userId)
      .in('status', ['requested', 'confirmed'])
      .select('id, advisor_user_id')
      .maybeSingle()
    if (error) throw new HttpError(500, '相談申込みを取り消せませんでした。')
    if (!data) throw new HttpError(404, '対応中の相談申込みが見つかりません。')
    await writeAuditLog(session.supabase, session.userId, 'consultation_appointment_cancelled', 'advisor', data.advisor_user_id)
    sendJson(res, 200, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH'])
}

export default withErrorHandling(handler)
