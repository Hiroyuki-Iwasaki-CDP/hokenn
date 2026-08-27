import { createSupabaseAdminClient } from './supabaseServer.js'
import type { LinePushResult } from './lineMessaging.js'

export type LineNotificationEvent =
  | 'appointment_requested'
  | 'appointment_rescheduled'
  | 'customer_cancelled'
  | 'advisor_confirmed'
  | 'advisor_cancelled'

/** 通知本文・LINE IDを含めず、配送結果だけをベストエフォートで記録する。 */
export async function recordLineNotificationDelivery(input: {
  appointmentId: string
  customerUserId: string
  advisorUserId: string
  event: LineNotificationEvent
  recipientRole: 'customer' | 'advisor'
  result: LinePushResult
}): Promise<void> {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.from('line_notification_deliveries').insert({
    appointment_id: input.appointmentId,
    customer_user_id: input.customerUserId,
    advisor_user_id: input.advisorUserId,
    event: input.event,
    recipient_role: input.recipientRole,
    status: input.result.status,
    response_status: input.result.responseStatus,
  })
  if (error) console.error('[line-notification] failed to record delivery result', { event: input.event })
}
