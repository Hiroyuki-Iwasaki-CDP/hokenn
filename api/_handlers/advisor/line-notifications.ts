import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../../_lib/http.js'
import { requireAdvisorSession } from '../../_lib/session.js'
import { writeAuditLog } from '../../_lib/audit.js'
import { createSupabaseAdminClient } from '../../_lib/supabaseServer.js'
import { pushLineText } from '../../_lib/lineMessaging.js'
import { recordLineNotificationDelivery, type LineNotificationEvent } from '../../_lib/lineNotificationDelivery.js'
import { buildAdvisorLineNotification, buildCustomerLineNotification } from '../../_lib/consultationLineMessages.js'
import { assertWithinRateLimit, LINE_TEST_NOTIFICATION_RULES, recordRateLimitEvent } from '../../_lib/rateLimit.js'

const resolveSchema = z.object({ id: z.string().uuid() }).strict()
const retrySchema = z.object({ id: z.string().uuid() }).strict()
const eventSchema = z.enum(['appointment_requested', 'appointment_rescheduled', 'customer_cancelled', 'advisor_confirmed', 'advisor_cancelled'])

function canRetryForStatus(event: LineNotificationEvent, appointmentStatus: string): boolean {
  if (event === 'appointment_requested' || event === 'appointment_rescheduled') return appointmentStatus === 'requested'
  if (event === 'advisor_confirmed') return appointmentStatus === 'confirmed'
  return appointmentStatus === 'cancelled'
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAdvisorSession(req, res)

  if (req.method === 'GET') {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: unresolved, error }, { count: sentLast30Days, error: countError }] = await Promise.all([
      session.supabase
        .from('line_notification_deliveries')
        .select('id, customer_user_id, event, recipient_role, status, response_status, attempted_at')
        .eq('advisor_user_id', session.userId)
        .neq('status', 'sent')
        .is('resolved_at', null)
        .order('attempted_at', { ascending: false })
        .limit(20),
      session.supabase
        .from('line_notification_deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('advisor_user_id', session.userId)
        .eq('status', 'sent')
        .gte('attempted_at', since),
    ])
    if (error || countError) throw new HttpError(500, 'LINE通知履歴を読み込めませんでした。')

    const customerIds = [...new Set((unresolved ?? []).map((item) => item.customer_user_id))]
    const { data: customers, error: customerError } = customerIds.length
      ? await session.supabase.from('users').select('id, email, display_name').in('id', customerIds).eq('advisor_id', session.userId)
      : { data: [], error: null }
    if (customerError) throw new HttpError(500, '通知先の契約者を確認できませんでした。')
    const customerById = new Map((customers ?? []).map((customer) => [customer.id, customer] as const))

    sendJson(res, 200, {
      sentLast30Days: sentLast30Days ?? 0,
      unresolved: (unresolved ?? []).flatMap((item) => {
        const customer = customerById.get(item.customer_user_id)
        return customer ? [{
          id: item.id,
          customerId: item.customer_user_id,
          customerName: customer.display_name,
          customerEmail: customer.email,
          event: item.event,
          recipientRole: item.recipient_role,
          status: item.status,
          responseStatus: item.response_status,
          attemptedAt: item.attempted_at,
        }] : []
      }),
    })
    return
  }

  if (req.method === 'PATCH') {
    assertTrustedOrigin(req)
    const input = resolveSchema.parse(await readJsonBody(req))
    const { data, error } = await session.supabase
      .from('line_notification_deliveries')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', input.id)
      .eq('advisor_user_id', session.userId)
      .neq('status', 'sent')
      .is('resolved_at', null)
      .select('id')
      .maybeSingle()
    if (error) throw new HttpError(500, '通知履歴を更新できませんでした。')
    if (!data) throw new HttpError(404, '要確認の通知が見つかりません。')
    await writeAuditLog(session.supabase, session.userId, 'line_notification_acknowledged', 'line_notification', input.id)
    sendJson(res, 200, { ok: true })
    return
  }

  if (req.method === 'POST') {
    assertTrustedOrigin(req)
    await assertWithinRateLimit(session.userId, 'line_test_notification', LINE_TEST_NOTIFICATION_RULES)
    await recordRateLimitEvent(session.userId, 'line_test_notification')
    const input = retrySchema.parse(await readJsonBody(req))
    const { data: delivery, error: deliveryError } = await session.supabase
      .from('line_notification_deliveries')
      .select('id, appointment_id, customer_user_id, advisor_user_id, event, recipient_role')
      .eq('id', input.id)
      .eq('advisor_user_id', session.userId)
      .neq('status', 'sent')
      .is('resolved_at', null)
      .maybeSingle()
    if (deliveryError) throw new HttpError(500, '通知履歴を確認できませんでした。')
    if (!delivery?.appointment_id) throw new HttpError(404, '再送できる通知が見つかりません。')

    const event = eventSchema.parse(delivery.event)
    const admin = createSupabaseAdminClient()
    const [{ data: appointment, error: appointmentError }, { data: customer, error: customerError }] = await Promise.all([
      admin.from('consultation_appointments').select('id, customer_user_id, advisor_user_id, status, confirmed_start_at').eq('id', delivery.appointment_id).maybeSingle(),
      admin.from('users').select('id, display_name, line_user_id').eq('id', delivery.customer_user_id).maybeSingle(),
    ])
    if (appointmentError || customerError) throw new HttpError(500, '相談情報を確認できませんでした。')
    if (!appointment || !customer || appointment.advisor_user_id !== session.userId || appointment.customer_user_id !== delivery.customer_user_id) {
      throw new HttpError(404, '再送できる相談が見つかりません。')
    }
    if (!canRetryForStatus(event, appointment.status)) {
      throw new HttpError(409, '相談の状態が変わっているため、この通知は再送できません。内容を確認して「確認済み」にしてください。')
    }

    let recipientLineUserId: string | null
    let message: string
    if (delivery.recipient_role === 'advisor') {
      const { data: advisor, error: advisorError } = await admin.from('users').select('line_user_id').eq('id', session.userId).maybeSingle()
      if (advisorError) throw new HttpError(500, '担当者のLINE連携を確認できませんでした。')
      recipientLineUserId = advisor?.line_user_id ?? null
      if (event !== 'appointment_requested' && event !== 'appointment_rescheduled' && event !== 'customer_cancelled') {
        throw new HttpError(400, '通知先を確認できませんでした。')
      }
      message = buildAdvisorLineNotification(event, customer.display_name || '契約者')
    } else {
      recipientLineUserId = customer.line_user_id
      if (event !== 'advisor_confirmed' && event !== 'advisor_cancelled') throw new HttpError(400, '通知先を確認できませんでした。')
      message = buildCustomerLineNotification(event, appointment.confirmed_start_at)
    }

    const result = await pushLineText(recipientLineUserId, message)
    const recorded = await recordLineNotificationDelivery({
      appointmentId: appointment.id,
      customerUserId: appointment.customer_user_id,
      advisorUserId: session.userId,
      event,
      recipientRole: delivery.recipient_role,
      result,
    })
    if (!recorded && result.status !== 'sent') throw new HttpError(500, '送信結果を記録できませんでした。最新の状態を確認してください。')
    const { error: resolveError } = await admin
      .from('line_notification_deliveries')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', delivery.id)
      .eq('advisor_user_id', session.userId)
    if (resolveError) throw new HttpError(500, '再送後の通知履歴を更新できませんでした。画面を再読み込みしてください。')
    await writeAuditLog(session.supabase, session.userId, 'line_notification_retried', 'line_notification', delivery.id)
    if (result.status !== 'sent') {
      throw new HttpError(502, result.status === 'not_linked' ? '通知先のLINEがまだ連携されていません。連携後にもう一度お試しください。' : 'LINE通知を再送できませんでした。しばらくしてからもう一度お試しください。')
    }
    sendJson(res, 200, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH'])
}

export default withErrorHandling(handler)
