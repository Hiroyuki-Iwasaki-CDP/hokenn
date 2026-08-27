import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, methodNotAllowed, sendJson, withErrorHandling } from '../../_lib/http.js'
import { requireEnv } from '../../_lib/env.js'
import { createSupabaseAdminClient } from '../../_lib/supabaseServer.js'
import { pushLineText, type LinePushResult } from '../../_lib/lineMessaging.js'

const TOKYO_TIME_ZONE = 'Asia/Tokyo'

function tokyoDate(addDays = 0): string {
  return new Date(Date.now() + addDays * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE', { timeZone: TOKYO_TIME_ZONE })
}

function formatJapaneseDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return `${year}年${month}月${day}日`
}

function formatAppointmentDate(value: string): string {
  return new Date(value).toLocaleString('ja-JP', {
    timeZone: TOKYO_TIME_ZONE,
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
  })
}

async function reserveDelivery(admin: ReturnType<typeof createSupabaseAdminClient>, input: {
  userId: string
  kind: 'policy_milestone' | 'appointment'
  resourceKey: string
  scheduledFor: string
}): Promise<string | null> {
  const { data, error } = await admin.from('line_reminder_deliveries').insert({
    user_id: input.userId,
    reminder_kind: input.kind,
    resource_key: input.resourceKey,
    scheduled_for: input.scheduledFor,
  }).select('id').single()
  if (error?.code === '23505') return null
  if (error || !data) throw new Error('failed to reserve LINE reminder delivery')
  return data.id
}

async function completeDelivery(admin: ReturnType<typeof createSupabaseAdminClient>, id: string, result: LinePushResult): Promise<void> {
  const { error } = await admin.from('line_reminder_deliveries').update({
    status: result.status,
    response_status: result.responseStatus,
    attempted_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) console.error('[line-reminder] failed to update delivery result')
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
  if (req.headers.authorization !== `Bearer ${requireEnv('CRON_SECRET')}`) throw new HttpError(401, '認証できませんでした。')

  const admin = createSupabaseAdminClient()
  const { data: preferences, error: preferenceError } = await admin
    .from('line_notification_preferences')
    .select('user_id, policy_milestone_reminders, appointment_reminders')
    .or('policy_milestone_reminders.eq.true,appointment_reminders.eq.true')
  if (preferenceError) throw new HttpError(500, 'LINE通知設定を読み込めませんでした。')
  if (!preferences?.length) return sendJson(res, 200, { ok: true, sent: 0, skipped: 0, failed: 0 })

  const userIds = preferences.map((preference) => preference.user_id)
  const { data: users, error: userError } = await admin.from('users').select('id, line_user_id').in('id', userIds).is('deleted_at', null)
  if (userError) throw new HttpError(500, 'LINE連携状態を読み込めませんでした。')
  const lineUserById = new Map((users ?? []).map((user) => [user.id, user.line_user_id] as const))

  const milestoneDate = tokyoDate(30)
  const policyUserIds = preferences.filter((preference) => preference.policy_milestone_reminders).map((preference) => preference.user_id)
  const { data: policies, error: policyError } = policyUserIds.length
    ? await admin.from('insurance_policies')
        .select('id, owner_user_id, product_name, renewal_date, maturity_date')
        .in('owner_user_id', policyUserIds)
        .eq('status', 'active')
        .is('deleted_at', null)
        .or(`renewal_date.eq.${milestoneDate},maturity_date.eq.${milestoneDate}`)
    : { data: [], error: null }
  if (policyError) throw new HttpError(500, '更新・満期情報を読み込めませんでした。')
  const policiesByUser = new Map<string, typeof policies>()
  for (const policy of policies ?? []) {
    const current = policiesByUser.get(policy.owner_user_id) ?? []
    current.push(policy)
    policiesByUser.set(policy.owner_user_id, current)
  }

  const tomorrow = tokyoDate(1)
  const dayAfterTomorrow = tokyoDate(2)
  const appointmentUserIds = preferences.filter((preference) => preference.appointment_reminders).map((preference) => preference.user_id)
  const { data: appointments, error: appointmentError } = appointmentUserIds.length
    ? await admin.from('consultation_appointments')
        .select('id, customer_user_id, confirmed_start_at')
        .in('customer_user_id', appointmentUserIds)
        .eq('status', 'confirmed')
        .gte('confirmed_start_at', `${tomorrow}T00:00:00+09:00`)
        .lt('confirmed_start_at', `${dayAfterTomorrow}T00:00:00+09:00`)
    : { data: [], error: null }
  if (appointmentError) throw new HttpError(500, '相談予定を読み込めませんでした。')

  let sent = 0
  let skipped = 0
  let failed = 0
  for (const preference of preferences) {
    const userPolicies = policiesByUser.get(preference.user_id) ?? []
    if (preference.policy_milestone_reminders && userPolicies.length > 0) {
      const deliveryId = await reserveDelivery(admin, { userId: preference.user_id, kind: 'policy_milestone', resourceKey: 'daily-summary', scheduledFor: milestoneDate })
      if (!deliveryId) skipped += 1
      else {
        const shown = userPolicies.slice(0, 10).map((policy) => {
          const kind = policy.renewal_date === milestoneDate ? '更新' : '満期'
          return `・${String(policy.product_name).slice(0, 80)}（${kind}）`
        })
        if (userPolicies.length > shown.length) shown.push(`・ほか${userPolicies.length - shown.length}件`)
        const result = await pushLineText(lineUserById.get(preference.user_id), `保険の更新・満期が近づいています。\n\n${formatJapaneseDate(milestoneDate)}の予定\n${shown.join('\n')}\n\n登録内容をアプリでご確認ください。\n${new URL('/line', requireEnv('ALLOWED_ORIGIN')).toString()}`)
        await completeDelivery(admin, deliveryId, result)
        if (result.status === 'sent') sent += 1
        else failed += 1
      }
    }
  }

  for (const appointment of appointments ?? []) {
    const deliveryId = await reserveDelivery(admin, { userId: appointment.customer_user_id, kind: 'appointment', resourceKey: appointment.id, scheduledFor: tomorrow })
    if (!deliveryId) {
      skipped += 1
      continue
    }
    const result = await pushLineText(lineUserById.get(appointment.customer_user_id), `明日は保険相談の予定日です。\n\n${formatAppointmentDate(appointment.confirmed_start_at)}\n\n予定の変更が必要な場合は、担当者へご連絡ください。\n${new URL('/line?next=consultation', requireEnv('ALLOWED_ORIGIN')).toString()}`)
    await completeDelivery(admin, deliveryId, result)
    if (result.status === 'sent') sent += 1
    else failed += 1
  }

  sendJson(res, 200, { ok: true, sent, skipped, failed })
}

export default withErrorHandling(handler)
