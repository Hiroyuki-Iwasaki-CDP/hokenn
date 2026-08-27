import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../_lib/http.js'
import { requireSessionUser } from '../_lib/session.js'
import { writeAuditLog } from '../_lib/audit.js'

const updateSchema = z.object({
  policyMilestoneReminders: z.boolean(),
  appointmentReminders: z.boolean(),
}).strict()

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSessionUser(req, res)
  const { data: user, error: userError } = await session.supabase
    .from('users')
    .select('role, line_user_id')
    .eq('id', session.userId)
    .maybeSingle()
  if (userError) throw new HttpError(500, '利用者情報を確認できませんでした。')
  if (user?.role !== 'customer') throw new HttpError(403, 'この設定は契約者アカウントでのみ利用できます。')

  if (req.method === 'GET') {
    const { data, error } = await session.supabase
      .from('line_notification_preferences')
      .select('policy_milestone_reminders, appointment_reminders')
      .eq('user_id', session.userId)
      .maybeSingle()
    if (error) throw new HttpError(500, 'LINE通知設定を読み込めませんでした。')
    sendJson(res, 200, {
      policyMilestoneReminders: data?.policy_milestone_reminders ?? false,
      appointmentReminders: data?.appointment_reminders ?? false,
    })
    return
  }

  if (req.method === 'PUT') {
    assertTrustedOrigin(req)
    const input = updateSchema.parse(await readJsonBody(req))
    if ((input.policyMilestoneReminders || input.appointmentReminders) && !user.line_user_id) {
      throw new HttpError(400, '先にLINEアカウントを連携してください。')
    }
    const { data: existing, error: existingError } = await session.supabase
      .from('line_notification_preferences')
      .select('user_id')
      .eq('user_id', session.userId)
      .maybeSingle()
    if (existingError) throw new HttpError(500, 'LINE通知設定を確認できませんでした。')
    const values = {
      policy_milestone_reminders: input.policyMilestoneReminders,
      appointment_reminders: input.appointmentReminders,
    }
    const { error } = existing
      ? await session.supabase.from('line_notification_preferences').update(values).eq('user_id', session.userId)
      : await session.supabase.from('line_notification_preferences').insert({ user_id: session.userId, ...values })
    if (error) throw new HttpError(500, 'LINE通知設定を保存できませんでした。')
    await writeAuditLog(session.supabase, session.userId, 'line_reminder_preferences_updated', 'user')
    sendJson(res, 200, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'PUT'])
}

export default withErrorHandling(handler)
