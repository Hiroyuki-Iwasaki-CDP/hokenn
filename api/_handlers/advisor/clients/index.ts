import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../../../_lib/http.js'
import { requireAdvisorSession } from '../../../_lib/session.js'
import { createSupabaseAdminClient, createSupabaseAuthClient } from '../../../_lib/supabaseServer.js'
import { inviteClientSchema } from '../../../_lib/validation.js'
import { writeAuditLog } from '../../../_lib/audit.js'

/**
 * FP専用: 自分が招待した顧客の一覧・招待。
 * 一覧では氏名・メール・登録状況と、契約者本人が保険情報の全件共有を許可しているかだけを扱う。
 * 実際の保険情報は共有許可を再確認する専用の読み取りAPIからのみ取得する。
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

    const { data: consents, error: consentError } = await session.supabase
      .from('policy_sharing_consents')
      .select('customer_user_id, granted_at')
      .eq('advisor_user_id', session.userId)
      .eq('scope', 'full')
      .is('revoked_at', null)
    if (consentError) throw new HttpError(500, 'サーバーエラーが発生しました。')

    const consentByCustomer = new Map(
      (consents ?? []).map((consent) => [consent.customer_user_id, consent.granted_at] as const),
    )

    sendJson(res, 200, {
      clients: (data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        onboarded: !!row.terms_accepted_at,
        invitedAt: row.created_at,
        policySharingEnabled: consentByCustomer.has(row.id),
        policySharingGrantedAt: consentByCustomer.get(row.id) ?? null,
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

    // 顧客登録だけで終わらせず、そのままログイン用の6桁コードを送信する。
    // Cookieを持たない専用クライアントを使い、操作中の代理店セッションは変更しない。
    const authClient = createSupabaseAuthClient()
    const { error: emailError } = await authClient.auth.signInWithOtp({
      email: input.email,
      options: { shouldCreateUser: false },
    })
    if (emailError) {
      throw new HttpError(
        502,
        '顧客の登録は完了しましたが、招待メールを送信できませんでした。30秒以上待ってからもう一度お試しください。',
      )
    }

    sendJson(res, 201, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'POST'])
}

export default withErrorHandling(handler)
