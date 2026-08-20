import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../../_lib/http.js'
import { requireAdvisorSession } from '../../_lib/session.js'
import { createSupabaseAdminClient } from '../../_lib/supabaseServer.js'
import { inviteClientSchema } from '../../_lib/validation.js'
import { writeAuditLog } from '../../_lib/audit.js'

/**
 * FP専用: 自分が招待した顧客の一覧・招待。
 * 顧客の保険データ(insurance_policies等)には一切アクセスしない。氏名・メール・登録状況のみ扱う。
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAdvisorSession(req, res)

  if (req.method === 'GET') {
    // advisor_id = 自分 の行のみをRLS(advisor_select_own_clients)経由で取得する。
    const { data, error } = await session.supabase
      .from('users')
      .select('id, email, display_name, terms_accepted_at, created_at')
      .eq('advisor_id', session.userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')

    sendJson(res, 200, {
      clients: (data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        onboarded: !!row.terms_accepted_at,
        invitedAt: row.created_at,
      })),
    })
    return
  }

  if (req.method === 'POST') {
    assertTrustedOrigin(req)
    const input = inviteClientSchema.parse(await readJsonBody(req))
    const admin = createSupabaseAdminClient()

    // 既にpublic.usersに存在する場合はそれを再利用し、advisor_idを自分に紐づける。
    const { data: existing } = await admin.from('users').select('id, role').eq('email', input.email).maybeSingle()

    let targetUserId: string
    if (existing) {
      if (existing.role === 'advisor') {
        throw new HttpError(400, 'このメールアドレスは担当者アカウントとして登録されているため招待できません。')
      }
      targetUserId = existing.id
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: input.email,
        email_confirm: true,
      })
      if (createError || !created.user) {
        throw new HttpError(500, '招待の処理に失敗しました。しばらくしてから再度お試しください。')
      }
      targetUserId = created.user.id
    }

    const { error: upsertError } = await admin
      .from('users')
      .upsert({ id: targetUserId, email: input.email, advisor_id: session.userId }, { onConflict: 'id' })

    if (upsertError) throw new HttpError(500, 'サーバーエラーが発生しました。')

    await writeAuditLog(session.supabase, session.userId, 'invite_client', 'user', targetUserId)
    sendJson(res, 201, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'POST'])
}

export default withErrorHandling(handler)
