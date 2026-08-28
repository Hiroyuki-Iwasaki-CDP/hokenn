import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../../_lib/http.js'
import { requireOperatorSession } from '../../_lib/session.js'
import { createSupabaseAdminClient } from '../../_lib/supabaseServer.js'
import { operatorAdvisorInviteSchema, operatorAdvisorStatusSchema } from '../../_lib/validation.js'
import { requireEnv } from '../../_lib/env.js'
import { writeAuditLog } from '../../_lib/audit.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireOperatorSession(req, res)
  const admin = createSupabaseAdminClient()

  if (req.method === 'GET') {
    const [{ data: advisors, error }, { data: customers, error: customerError }, { data: profiles, error: profileError }] = await Promise.all([
      admin
        .from('users')
        .select('id, email, display_name, is_operator, is_active, terms_accepted_at, created_at')
        .eq('role', 'advisor')
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      admin.from('users').select('advisor_id').eq('role', 'customer').is('deleted_at', null).not('advisor_id', 'is', null),
      admin.from('advisor_profiles').select('owner_user_id, agency_name'),
    ])
    if (error || customerError || profileError) throw new HttpError(500, '担当者一覧を読み込めませんでした。')

    const clientCounts = new Map<string, number>()
    for (const customer of customers ?? []) {
      if (customer.advisor_id) clientCounts.set(customer.advisor_id, (clientCounts.get(customer.advisor_id) ?? 0) + 1)
    }
    const agencyByAdvisor = new Map((profiles ?? []).map((profile) => [profile.owner_user_id, profile.agency_name] as const))

    sendJson(res, 200, {
      advisors: (advisors ?? []).map((advisor) => ({
        id: advisor.id,
        email: advisor.email,
        displayName: advisor.display_name,
        agencyName: agencyByAdvisor.get(advisor.id) ?? null,
        isOperator: advisor.is_operator,
        isActive: advisor.is_active,
        onboarded: !!advisor.terms_accepted_at,
        clientCount: clientCounts.get(advisor.id) ?? 0,
        createdAt: advisor.created_at,
      })),
    })
    return
  }

  if (req.method === 'POST') {
    assertTrustedOrigin(req)
    const input = operatorAdvisorInviteSchema.parse(await readJsonBody(req))
    const { data: existing, error: existingError } = await admin.from('users').select('id, role').eq('email', input.email).maybeSingle()
    if (existingError) throw new HttpError(500, 'アカウントを確認できませんでした。')
    if (existing) {
      throw new HttpError(409, existing.role === 'advisor'
        ? 'このメールアドレスはすでに担当者として登録されています。'
        : 'このメールアドレスは契約者として登録されているため、担当者には変更できません。')
    }

    const redirectTo = `${requireEnv('ALLOWED_ORIGIN')}/login?advisor=invited`
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo,
      data: { account_role: 'advisor' },
    })
    if (inviteError || !invited.user) {
      throw new HttpError(502, '担当者の招待メールを送信できませんでした。しばらく待ってから再度お試しください。')
    }

    const { error: insertError } = await admin.from('users').upsert({
      id: invited.user.id,
      email: input.email,
      role: 'advisor',
      is_active: true,
      invitation_provisioned: true,
    }, { onConflict: 'id' })
    if (insertError) {
      await admin.auth.admin.deleteUser(invited.user.id)
      throw new HttpError(500, '担当者アカウントを作成できませんでした。')
    }

    await writeAuditLog(session.supabase, session.userId, 'invite_advisor', 'advisor', invited.user.id)
    sendJson(res, 201, { ok: true })
    return
  }

  if (req.method === 'PATCH') {
    assertTrustedOrigin(req)
    const input = operatorAdvisorStatusSchema.parse(await readJsonBody(req))
    if (input.id === session.userId && !input.active) throw new HttpError(400, 'ログイン中の運営者自身は利用停止にできません。')

    const { data: target, error: targetError } = await admin
      .from('users')
      .select('id, is_operator')
      .eq('id', input.id)
      .eq('role', 'advisor')
      .is('deleted_at', null)
      .maybeSingle()
    if (targetError || !target) throw new HttpError(404, '担当者アカウントが見つかりません。')
    if (target.is_operator && !input.active) throw new HttpError(400, '運営権限を持つ担当者は利用停止にできません。')

    const { error: updateError } = await admin.from('users').update({ is_active: input.active }).eq('id', input.id)
    if (updateError) throw new HttpError(500, '担当者の利用状態を変更できませんでした。')

    await writeAuditLog(session.supabase, session.userId, input.active ? 'reactivate_advisor' : 'suspend_advisor', 'advisor', input.id)
    sendJson(res, 200, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH'])
}

export default withErrorHandling(handler)
