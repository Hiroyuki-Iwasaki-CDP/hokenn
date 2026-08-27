import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../../_lib/http.js'
import { requireAdvisorSession } from '../../_lib/session.js'
import { writeAuditLog } from '../../_lib/audit.js'

const resolveSchema = z.object({ id: z.string().uuid() }).strict()

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

  methodNotAllowed(res, ['GET', 'PATCH'])
}

export default withErrorHandling(handler)
