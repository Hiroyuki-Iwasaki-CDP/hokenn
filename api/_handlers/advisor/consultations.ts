import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../../_lib/http.js'
import { requireAdvisorSession } from '../../_lib/session.js'
import { writeAuditLog } from '../../_lib/audit.js'

const resolveSchema = z.object({ id: z.string().uuid(), status: z.literal('resolved') }).strict()

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAdvisorSession(req, res)

  if (req.method === 'GET') {
    const { data: requests, error } = await session.supabase
      .from('line_consultation_requests')
      .select('customer_user_id, requested_at')
      .eq('advisor_user_id', session.userId)
      .eq('status', 'open')
      .order('requested_at', { ascending: false })
    if (error) throw new HttpError(500, '相談受付を読み込めませんでした。')

    const customerIds = (requests ?? []).map((request) => request.customer_user_id)
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
      consultations: (requests ?? []).flatMap((request) => {
        const customer = customerById.get(request.customer_user_id)
        return customer
          ? [{
              id: request.customer_user_id,
              customerId: customer.id,
              email: customer.email,
              displayName: customer.display_name,
              requestedAt: request.requested_at,
            }]
          : []
      }),
    })
    return
  }

  if (req.method === 'PATCH') {
    assertTrustedOrigin(req)
    const input = resolveSchema.parse(await readJsonBody(req))
    const { data, error } = await session.supabase
      .from('line_consultation_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('customer_user_id', input.id)
      .eq('advisor_user_id', session.userId)
      .eq('status', 'open')
      .select('customer_user_id')
      .maybeSingle()
    if (error) throw new HttpError(500, '相談受付を更新できませんでした。')
    if (!data) throw new HttpError(404, '未対応の相談受付が見つかりません。')

    await writeAuditLog(session.supabase, session.userId, 'line_consultation_resolved', 'user', data.customer_user_id)
    sendJson(res, 200, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'PATCH'])
}

export default withErrorHandling(handler)
