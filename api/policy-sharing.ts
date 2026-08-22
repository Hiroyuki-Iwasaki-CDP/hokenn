import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from './_lib/http.js'
import { requireSessionUser } from './_lib/session.js'
import { policySharingUpdateSchema } from './_lib/validation.js'
import { writeAuditLog } from './_lib/audit.js'

async function getCustomerContext(
  session: Awaited<ReturnType<typeof requireSessionUser>>,
): Promise<{ advisorId: string | null }> {
  const { data, error } = await session.supabase
    .from('users')
    .select('role, advisor_id')
    .eq('id', session.userId)
    .maybeSingle()

  if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')
  if (data?.role !== 'customer') {
    throw new HttpError(403, 'この操作は契約者アカウントでのみ行えます。')
  }
  return { advisorId: data.advisor_id ?? null }
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSessionUser(req, res)
  const { advisorId } = await getCustomerContext(session)

  if (req.method === 'GET') {
    const { data, error } = await session.supabase
      .from('policy_sharing_consents')
      .select('advisor_user_id, scope, granted_at, revoked_at')
      .eq('customer_user_id', session.userId)
      .maybeSingle()

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')

    const enabled = !!advisorId && data?.advisor_user_id === advisorId && data.scope === 'full' && !data.revoked_at
    sendJson(res, 200, {
      sharing: {
        available: !!advisorId,
        enabled,
        scope: enabled ? 'full' : null,
        grantedAt: enabled ? data?.granted_at ?? null : null,
      },
    })
    return
  }

  if (req.method === 'PUT') {
    assertTrustedOrigin(req)
    const input = policySharingUpdateSchema.parse(await readJsonBody(req))

    if (input.enabled) {
      if (!advisorId) {
        throw new HttpError(400, '担当者が設定されていないため、保険情報を共有できません。')
      }

      const now = new Date().toISOString()
      const { error } = await session.supabase.from('policy_sharing_consents').upsert(
        {
          customer_user_id: session.userId,
          advisor_user_id: advisorId,
          scope: 'full',
          granted_at: now,
          revoked_at: null,
        },
        { onConflict: 'customer_user_id' },
      )
      if (error) throw new HttpError(500, '共有設定を保存できませんでした。')

      await writeAuditLog(session.supabase, session.userId, 'grant_full_policy_access', 'advisor', advisorId)
      sendJson(res, 200, { sharing: { available: true, enabled: true, scope: 'full', grantedAt: now } })
      return
    }

    const now = new Date().toISOString()
    const { error } = await session.supabase
      .from('policy_sharing_consents')
      .update({ revoked_at: now })
      .eq('customer_user_id', session.userId)
      .is('revoked_at', null)
    if (error) throw new HttpError(500, '共有設定を解除できませんでした。')

    if (advisorId) {
      await writeAuditLog(session.supabase, session.userId, 'revoke_full_policy_access', 'advisor', advisorId)
    }
    sendJson(res, 200, { sharing: { available: !!advisorId, enabled: false, scope: null, grantedAt: null } })
    return
  }

  methodNotAllowed(res, ['GET', 'PUT'])
}

export default withErrorHandling(handler)

