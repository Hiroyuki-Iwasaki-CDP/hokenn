import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../../_lib/http.js'
import { requireAdvisorSession } from '../../_lib/session.js'
import { writeAuditLog } from '../../_lib/audit.js'
import { createSupabaseAdminClient } from '../../_lib/supabaseServer.js'
import { pushLineText } from '../../_lib/lineMessaging.js'

const updateSchema = z.discriminatedUnion('status', [
  z.object({ id: z.string().uuid(), status: z.literal('confirmed'), selectedChoice: z.enum(['first', 'second']) }).strict(),
  z.object({ id: z.string().uuid(), status: z.literal('completed') }).strict(),
  z.object({ id: z.string().uuid(), status: z.literal('cancelled') }).strict(),
])

const COLUMNS =
  'id, customer_user_id, topic, first_choice_at, second_choice_at, confirmed_start_at, status, requested_at, confirmed_at, completed_at, cancelled_at'

function formatLineDate(value: string): string {
  return new Date(value).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAdvisorSession(req, res)

  if (req.method === 'GET') {
    const { data: appointments, error } = await session.supabase
      .from('consultation_appointments')
      .select(COLUMNS)
      .eq('advisor_user_id', session.userId)
      .order('requested_at', { ascending: false })
      .limit(50)
    if (error) throw new HttpError(500, '相談予約を読み込めませんでした。')

    const customerIds = [...new Set((appointments ?? []).map((item) => item.customer_user_id))]
    const { data: customers, error: customerError } = customerIds.length
      ? await session.supabase
          .from('users')
          .select('id, email, display_name')
          .in('id', customerIds)
          .eq('advisor_id', session.userId)
      : { data: [], error: null }
    if (customerError) throw new HttpError(500, '相談者を確認できませんでした。')
    const customerById = new Map((customers ?? []).map((customer) => [customer.id, customer] as const))

    sendJson(res, 200, {
      appointments: (appointments ?? []).flatMap((item) => {
        const customer = customerById.get(item.customer_user_id)
        return customer
          ? [{
              id: item.id,
              customerId: customer.id,
              email: customer.email,
              displayName: customer.display_name,
              topic: item.topic,
              firstChoiceAt: item.first_choice_at,
              secondChoiceAt: item.second_choice_at,
              confirmedStartAt: item.confirmed_start_at,
              status: item.status,
              requestedAt: item.requested_at,
              confirmedAt: item.confirmed_at,
              completedAt: item.completed_at,
              cancelledAt: item.cancelled_at,
            }]
          : []
      }),
    })
    return
  }

  if (req.method === 'PATCH') {
    assertTrustedOrigin(req)
    const input = updateSchema.parse(await readJsonBody(req))
    const { data: current, error: currentError } = await session.supabase
      .from('consultation_appointments')
      .select('id, customer_user_id, first_choice_at, second_choice_at, status')
      .eq('id', input.id)
      .eq('advisor_user_id', session.userId)
      .maybeSingle()
    if (currentError) throw new HttpError(500, '相談予約を確認できませんでした。')
    if (!current) throw new HttpError(404, '相談予約が見つかりません。')

    const now = new Date().toISOString()
    let values: Record<string, string | null>
    let allowedCurrent: string[]
    if (input.status === 'confirmed') {
      const confirmedStartAt = input.selectedChoice === 'first' ? current.first_choice_at : current.second_choice_at
      if (!confirmedStartAt) throw new HttpError(400, '選択された第2希望日時がありません。')
      values = { status: 'confirmed', confirmed_start_at: confirmedStartAt, confirmed_at: now }
      allowedCurrent = ['requested', 'confirmed']
    } else if (input.status === 'completed') {
      values = { status: 'completed', completed_at: now }
      allowedCurrent = ['confirmed']
    } else {
      values = { status: 'cancelled', cancelled_at: now }
      allowedCurrent = ['requested', 'confirmed']
    }

    const { data, error } = await session.supabase
      .from('consultation_appointments')
      .update(values)
      .eq('id', input.id)
      .eq('advisor_user_id', session.userId)
      .in('status', allowedCurrent)
      .select('id')
      .maybeSingle()
    if (error) throw new HttpError(500, '相談予約を更新できませんでした。')
    if (!data) throw new HttpError(409, '相談予約の状態がすでに変更されています。再読み込みしてください。')
    await writeAuditLog(session.supabase, session.userId, `consultation_appointment_${input.status}`, 'user', current.customer_user_id)

    if (input.status === 'confirmed' || input.status === 'cancelled') {
      const admin = createSupabaseAdminClient()
      const { data: customer } = await admin.from('users').select('line_user_id').eq('id', current.customer_user_id).maybeSingle()
      const notification = input.status === 'confirmed'
        ? `相談日時が確定しました。\n\n${formatLineDate(values.confirmed_start_at as string)}\n\nアプリで確認できます。\n${new URL('/line?next=consultation', process.env.ALLOWED_ORIGIN).toString()}`
        : `担当者が相談日時の申込みを取り消しました。必要に応じて担当者へご連絡ください。\n${new URL('/line?next=consultation', process.env.ALLOWED_ORIGIN).toString()}`
      await pushLineText(customer?.line_user_id, notification)
    }
    sendJson(res, 200, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'PATCH'])
}

export default withErrorHandling(handler)
