import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHash, randomBytes } from 'node:crypto'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../../../_lib/http.js'
import { requireAdvisorSession } from '../../../_lib/session.js'
import { createSupabaseAdminClient, createSupabaseAuthClient } from '../../../_lib/supabaseServer.js'
import { inviteClientSchema, revokeClientInvitationSchema } from '../../../_lib/validation.js'
import { writeAuditLog } from '../../../_lib/audit.js'
import { requireEnv } from '../../../_lib/env.js'

const INVITATION_VALID_DAYS = 7

function invitationHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * FP専用: 自分が招待した顧客の一覧・招待。
 * 一覧では氏名・メール・登録状況・LINE連携の有無と、契約者本人が保険情報の全件共有を許可しているかだけを扱う。
 * LINEユーザーIDやLINE表示名そのものは担当者へ返さない。
 * 実際の保険情報は共有許可を再確認する専用の読み取りAPIからのみ取得する。
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireAdvisorSession(req, res)

  if (req.method === 'GET') {
    // advisor_id = 自分 の行のみをRLS(advisor_select_own_clients)経由で取得する。
    const { data, error } = await session.supabase
      .from('users')
      .select('id, email, display_name, terms_accepted_at, line_user_id, created_at')
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

    // 招待トークン自体は返さず、自分が送った有効な承認待ち招待の最小情報だけを返す。
    const admin = createSupabaseAdminClient()
    const { data: pendingInvitations, error: invitationError } = await admin
      .from('customer_invitations')
      .select('id, email, invitation_kind, expires_at, created_at')
      .eq('advisor_user_id', session.userId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20)
    if (invitationError) throw new HttpError(500, '招待状況を確認できませんでした。')

    sendJson(res, 200, {
      clients: (data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        onboarded: !!row.terms_accepted_at,
        lineLinked: !!row.line_user_id,
        invitedAt: row.created_at,
        policySharingEnabled: consentByCustomer.has(row.id),
        policySharingGrantedAt: consentByCustomer.get(row.id) ?? null,
      })),
      pendingInvitations: (pendingInvitations ?? []).map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        invitationType: invitation.invitation_kind,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
      })),
    })
    return
  }

  if (req.method === 'POST') {
    assertTrustedOrigin(req)
    const input = inviteClientSchema.parse(await readJsonBody(req))
    const admin = createSupabaseAdminClient()

    // 既存顧客が別FPに紐づいている場合も招待はできるが、ここでは担当を変更しない。
    // メールを受け取った契約者本人が承認した時だけ担当変更を実行する。
    const { data: existing } = await admin.from('users').select('id, role, advisor_id').eq('email', input.email).maybeSingle()

    if (existing?.role === 'advisor') {
      throw new HttpError(400, 'このメールアドレスは担当者アカウントとして登録されているため招待できません。')
    }
    const isTransfer = !!existing?.advisor_id && existing.advisor_id !== session.userId

    const rawToken = randomBytes(32).toString('base64url')
    const tokenHash = invitationHash(rawToken)
    const expiresAt = new Date(Date.now() + INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const inviteUrl = `${requireEnv('ALLOWED_ORIGIN')}/invite/confirm?token=${encodeURIComponent(rawToken)}`

    // 同じ代理店から同じ宛先への古い未使用リンクは失効させる。
    await admin
      .from('customer_invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('advisor_user_id', session.userId)
      .eq('email', input.email)
      .is('accepted_at', null)
      .is('revoked_at', null)

    const { data: invitation, error: invitationError } = await admin
      .from('customer_invitations')
      .insert({
        advisor_user_id: session.userId,
        customer_user_id: existing?.id ?? null,
        email: input.email,
        token_hash: tokenHash,
        expires_at: expiresAt,
        invitation_kind: isTransfer ? 'transfer' : 'registration',
        previous_advisor_user_id: isTransfer ? existing?.advisor_id : null,
      })
      .select('id')
      .single()

    if (invitationError || !invitation) throw new HttpError(500, '招待リンクを作成できませんでした。')

    let targetUserId: string
    let createdByInvitation = false
    if (existing) {
      targetUserId = existing.id
    } else {
      const { data: created, error: createError } = await admin.auth.admin.inviteUserByEmail(input.email, {
        redirectTo: inviteUrl,
      })
      if (createError || !created.user) {
        await admin.from('customer_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', invitation.id)
        throw new HttpError(500, '招待の処理に失敗しました。しばらくしてから再度お試しください。')
      }
      targetUserId = created.user.id
      createdByInvitation = true
    }

    // 新規ユーザーの公開プロフィール行だけ用意する。担当FPは本人が招待を承認した時に設定する。
    if (createdByInvitation) {
      const { error: upsertError } = await admin
        .from('users')
        .upsert({ id: targetUserId, email: input.email, invitation_provisioned: true }, { onConflict: 'id' })

      if (upsertError) {
        await admin.from('customer_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', invitation.id)
        throw new HttpError(500, 'サーバーエラーが発生しました。')
      }
    }

    const { error: invitationLinkError } = await admin
      .from('customer_invitations')
      .update({ customer_user_id: targetUserId })
      .eq('id', invitation.id)
    if (invitationLinkError) {
      await admin.from('customer_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', invitation.id)
      throw new HttpError(500, '招待情報を紐づけできませんでした。しばらくしてから再度お試しください。')
    }

    // 新規ユーザーはinviteUserByEmailが招待メールを送信済み。既存ユーザーには同じ登録リンクを
    // Magic LinkテンプレートのRedirectToとして渡す（メール内の6桁コードはログイン用の予備手段）。
    if (existing) {
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(targetUserId)
      if (authUserError || !authUser.user) {
        await admin.from('customer_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', invitation.id)
        throw new HttpError(500, '招待先のアカウントを確認できませんでした。')
      }

      // Magic Link/OTPテンプレートを通常ログインと共用するため、この招待URLをメタデータへ保存する。
      // テンプレート側はRedirectToとの完全一致時だけ招待案内を表示し、6桁コードを重ねて表示しない。
      const { error: metadataError } = await admin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...(authUser.user.user_metadata ?? {}),
          pending_invitation_redirect: inviteUrl,
        },
      })
      if (metadataError) {
        await admin.from('customer_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', invitation.id)
        throw new HttpError(500, '招待メールを準備できませんでした。')
      }

      const authClient = createSupabaseAuthClient()
      const { error: emailError } = await authClient.auth.signInWithOtp({
        email: input.email,
        options: { shouldCreateUser: false, emailRedirectTo: inviteUrl },
      })
      if (emailError) {
        await admin.from('customer_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', invitation.id)
        throw new HttpError(
          502,
          '顧客の登録は完了しましたが、招待メールを送信できませんでした。30秒以上待ってからもう一度お試しください。',
        )
      }
    }

    await writeAuditLog(session.supabase, session.userId, 'invite_client', 'user', targetUserId)
    sendJson(res, 201, { ok: true, expiresAt, invitationType: isTransfer ? 'transfer' : 'registration' })
    return
  }

  if (req.method === 'DELETE') {
    assertTrustedOrigin(req)
    const input = revokeClientInvitationSchema.parse(await readJsonBody(req))
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('customer_invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', input.id)
      .eq('advisor_user_id', session.userId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .select('id, customer_user_id')
      .maybeSingle()

    if (error) throw new HttpError(500, '招待を取り消せませんでした。')
    if (!data) throw new HttpError(404, 'この招待はすでに承認済みか、取り消されています。')

    // アプリ招待が作成した未利用アカウントで、有効な別招待も無い場合だけ認証アカウントごと削除する。
    // 手動作成・既存顧客・利用開始済み顧客は絶対に削除しない。
    if (data.customer_user_id) {
      const [{ data: customer }, { count: otherActiveInvitations }] = await Promise.all([
        admin
          .from('users')
          .select('invitation_provisioned, terms_accepted_at')
          .eq('id', data.customer_user_id)
          .maybeSingle(),
        admin
          .from('customer_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('customer_user_id', data.customer_user_id)
          .is('accepted_at', null)
          .is('revoked_at', null)
          .gt('expires_at', new Date().toISOString()),
      ])
      if (customer?.invitation_provisioned && !customer.terms_accepted_at && (otherActiveInvitations ?? 0) === 0) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(data.customer_user_id)
        if (deleteError) throw new HttpError(500, '招待は無効化しましたが、仮アカウントを削除できませんでした。運営へご連絡ください。')
      }
    }

    await writeAuditLog(session.supabase, session.userId, 'revoke_client_invitation', 'invitation', input.id)
    sendJson(res, 200, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'POST', 'DELETE'])
}

export default withErrorHandling(handler)
