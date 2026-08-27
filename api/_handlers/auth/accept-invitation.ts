import { createHash } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../../_lib/http.js'
import { createSupabaseAdminClient, createSupabaseServerClient } from '../../_lib/supabaseServer.js'
import { acceptInvitationSchema } from '../../_lib/validation.js'
import { CURRENT_LEGAL_VERSION } from '../../_lib/legal.js'
import { writeAuditLog } from '../../_lib/audit.js'

function invitationHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const parsed = acceptInvitationSchema.safeParse({ token: req.query.token })
    if (!parsed.success) throw new HttpError(400, '招待リンクが正しくありません。代理店へ再招待をご依頼ください。')

    const admin = createSupabaseAdminClient()
    const now = new Date().toISOString()
    const { data: invitation, error } = await admin
      .from('customer_invitations')
      .select('advisor_user_id, previous_advisor_user_id, invitation_kind')
      .eq('token_hash', invitationHash(parsed.data.token))
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', now)
      .maybeSingle()

    if (error || !invitation) {
      throw new HttpError(400, '招待リンクが正しくないか、有効期限が切れています。代理店へ再招待をご依頼ください。')
    }

    const profileIds = [invitation.advisor_user_id, invitation.previous_advisor_user_id].filter(
      (id): id is string => typeof id === 'string',
    )
    const { data: profiles } = await admin
      .from('advisor_profiles')
      .select('owner_user_id, advisor_name, agency_name')
      .in('owner_user_id', profileIds)
    const profileByOwner = new Map((profiles ?? []).map((profile) => [profile.owner_user_id, profile] as const))
    const nextProfile = profileByOwner.get(invitation.advisor_user_id)
    const previousProfile = invitation.previous_advisor_user_id
      ? profileByOwner.get(invitation.previous_advisor_user_id)
      : undefined

    sendJson(res, 200, {
      valid: true,
      invitationType: invitation.invitation_kind,
      advisorName: nextProfile?.advisor_name ?? null,
      agencyName: nextProfile?.agency_name ?? null,
      previousAdvisorName: previousProfile?.advisor_name ?? null,
      previousAgencyName: previousProfile?.agency_name ?? null,
    })
    return
  }

  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST'])
  assertTrustedOrigin(req)

  const { token } = acceptInvitationSchema.parse(await readJsonBody(req))
  const admin = createSupabaseAdminClient()
  const acceptedAt = new Date().toISOString()

  // 条件付き更新で、同じ招待リンクを同時に二度使えないようにする。
  const { data: invitation, error: invitationError } = await admin
    .from('customer_invitations')
    .update({ accepted_at: acceptedAt })
    .eq('token_hash', invitationHash(token))
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', acceptedAt)
    .select('id, advisor_user_id, previous_advisor_user_id, customer_user_id, email, invitation_kind')
    .maybeSingle()

  if (invitationError || !invitation?.customer_user_id) {
    throw new HttpError(400, '招待リンクが正しくないか、有効期限が切れています。代理店へ再招待をご依頼ください。')
  }

  const releaseInvitation = async () => {
    await admin.from('customer_invitations').update({ accepted_at: null }).eq('id', invitation.id).eq('accepted_at', acceptedAt)
  }

  const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(invitation.customer_user_id)
  const authEmail = authUserData.user?.email
  if (authUserError || !authEmail || authEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    await releaseInvitation()
    throw new HttpError(400, '招待先を確認できませんでした。代理店へ再招待をご依頼ください。')
  }

  const { data: userRow, error: userError } = await admin
    .from('users')
    .select('advisor_id, terms_accepted_at, terms_version, privacy_version')
    .eq('id', invitation.customer_user_id)
    .eq('role', 'customer')
    .single()

  if (userError) {
    await releaseInvitation()
    throw new HttpError(500, '顧客情報を確認できませんでした。')
  }

  const isTransfer = invitation.invitation_kind === 'transfer'
  if (
    (isTransfer && (!invitation.previous_advisor_user_id || userRow.advisor_id !== invitation.previous_advisor_user_id)) ||
    (!isTransfer && userRow.advisor_id !== null && userRow.advisor_id !== invitation.advisor_user_id)
  ) {
    await releaseInvitation()
    throw new HttpError(409, '担当者の状態が招待時から変わっています。代理店へ再招待をご依頼ください。')
  }

  // メールで受け取った一度限りの招待トークンを確認できたため、Supabaseの短命な
  // Magic Linkトークンをサーバー内で発行・検証し、通常と同じhttpOnlyセッションを作る。
  const { data: generated, error: generateError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: authEmail,
  })
  const hashedToken = generated.properties?.hashed_token
  if (generateError || !hashedToken) {
    await releaseInvitation()
    throw new HttpError(500, '登録を開始できませんでした。しばらくしてからもう一度お試しください。')
  }

  const authClient = createSupabaseServerClient(req, res)
  const { data: verified, error: verifyError } = await authClient.auth.verifyOtp({
    token_hash: hashedToken,
    type: 'email',
  })
  if (verifyError || !verified.user || verified.user.id !== invitation.customer_user_id) {
    await releaseInvitation()
    throw new HttpError(400, '招待リンクを確認できませんでした。代理店へ再招待をご依頼ください。')
  }

  // 招待先本人のセッション作成まで成功してから、関連データを一つのDB処理で切り替える。
  // これ以降は失敗しうる必須処理を置かず、担当だけ変わってログインできない状態を避ける。
  if (isTransfer) {
    const { data: changed, error: transferError } = await admin.rpc('transfer_customer_advisor', {
      customer_uid: invitation.customer_user_id,
      new_advisor_uid: invitation.advisor_user_id,
      expected_previous_advisor_uid: invitation.previous_advisor_user_id,
    })
    if (transferError || changed !== true) {
      await authClient.auth.signOut()
      await releaseInvitation()
      throw new HttpError(409, '担当者を変更できませんでした。代理店へ再招待をご依頼ください。')
    }
  } else if (userRow.advisor_id === null) {
    const { data: assigned, error: assignmentError } = await admin.rpc('assign_customer_advisor', {
      customer_uid: invitation.customer_user_id,
      new_advisor_uid: invitation.advisor_user_id,
    })
    if (assignmentError || assigned !== true) {
      await authClient.auth.signOut()
      await releaseInvitation()
      throw new HttpError(409, '担当者を設定できませんでした。代理店へ再招待をご依頼ください。')
    }
  }

  await writeAuditLog(
    authClient,
    invitation.customer_user_id,
    isTransfer ? 'advisor_changed' : 'accept_invitation',
    'advisor',
    invitation.advisor_user_id,
  )

  const needsOnboarding =
    !userRow.terms_accepted_at ||
    userRow.terms_version !== CURRENT_LEGAL_VERSION ||
    userRow.privacy_version !== CURRENT_LEGAL_VERSION

  sendJson(res, 200, {
    ok: true,
    next: needsOnboarding ? '/onboarding' : isTransfer ? '/settings' : '/',
    advisorChanged: isTransfer,
  })
}

export default withErrorHandling(handler)
