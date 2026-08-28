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
  const admin = createSupabaseAdminClient()

  if (req.method === 'GET') {
    const parsed = acceptInvitationSchema.safeParse({ token: req.query.token })
    if (!parsed.success) throw new HttpError(400, '家族招待リンクが正しくありません。招待した方へ再送をご依頼ください。')

    const { data: invitation, error } = await admin
      .from('family_invitations')
      .select('inviter_user_id')
      .eq('token_hash', invitationHash(parsed.data.token))
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (error || !invitation) {
      throw new HttpError(400, '家族招待リンクが正しくないか、有効期限が切れています。招待した方へ再送をご依頼ください。')
    }

    const { data: inviter } = await admin
      .from('users')
      .select('display_name')
      .eq('id', invitation.inviter_user_id)
      .eq('role', 'customer')
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle()
    if (!inviter) throw new HttpError(400, 'この家族招待は現在利用できません。')
    sendJson(res, 200, { valid: true, inviterName: inviter.display_name ?? null })
    return
  }

  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST'])
  assertTrustedOrigin(req)
  const { token } = acceptInvitationSchema.parse(await readJsonBody(req))
  const acceptedAt = new Date().toISOString()

  const { data: invitation, error: invitationError } = await admin
    .from('family_invitations')
    .update({ accepted_at: acceptedAt })
    .eq('token_hash', invitationHash(token))
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', acceptedAt)
    .select('id, inviter_user_id, invitee_user_id, email')
    .maybeSingle()
  if (invitationError || !invitation?.invitee_user_id) {
    throw new HttpError(400, '家族招待リンクが正しくないか、有効期限が切れています。招待した方へ再送をご依頼ください。')
  }

  const releaseInvitation = async () => {
    await admin.from('family_invitations').update({ accepted_at: null }).eq('id', invitation.id).eq('accepted_at', acceptedAt)
  }

  const [{ data: authUserData, error: authUserError }, { data: invitee, error: inviteeError }, { data: inviter }] = await Promise.all([
    admin.auth.admin.getUserById(invitation.invitee_user_id),
    admin
      .from('users')
      .select('role, terms_accepted_at, terms_version, privacy_version')
      .eq('id', invitation.invitee_user_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle(),
    admin
      .from('users')
      .select('id')
      .eq('id', invitation.inviter_user_id)
      .eq('role', 'customer')
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle(),
  ])
  const authEmail = authUserData.user?.email
  if (
    authUserError ||
    inviteeError ||
    !authEmail ||
    authEmail.toLowerCase() !== invitation.email.toLowerCase() ||
    invitee?.role !== 'customer' ||
    !inviter ||
    invitation.inviter_user_id === invitation.invitee_user_id
  ) {
    await releaseInvitation()
    throw new HttpError(400, '家族招待の対象アカウントを確認できませんでした。')
  }

  const { data: generated, error: generateError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: authEmail })
  const hashedToken = generated.properties?.hashed_token
  if (generateError || !hashedToken) {
    await releaseInvitation()
    throw new HttpError(500, '家族連携を開始できませんでした。しばらくしてからもう一度お試しください。')
  }

  const authClient = createSupabaseServerClient(req, res)
  const { data: verified, error: verifyError } = await authClient.auth.verifyOtp({ token_hash: hashedToken, type: 'email' })
  if (verifyError || verified.user?.id !== invitation.invitee_user_id) {
    await releaseInvitation()
    throw new HttpError(400, '家族招待リンクを確認できませんでした。')
  }

  const [memberA, memberB] = [invitation.inviter_user_id, invitation.invitee_user_id].sort()
  const { data: currentConnection, error: currentError } = await admin
    .from('family_connections')
    .select('id')
    .eq('member_a_user_id', memberA)
    .eq('member_b_user_id', memberB)
    .is('revoked_at', null)
    .maybeSingle()
  if (currentError) {
    await authClient.auth.signOut()
    await releaseInvitation()
    throw new HttpError(500, '家族連携の状態を確認できませんでした。')
  }

  let connectionId = currentConnection?.id
  if (!connectionId) {
    const { data: inserted, error: insertError } = await admin
      .from('family_connections')
      .insert({
        member_a_user_id: memberA,
        member_b_user_id: memberB,
        created_by_user_id: invitation.inviter_user_id,
        accepted_at: acceptedAt,
      })
      .select('id')
      .single()
    if (insertError || !inserted) {
      await authClient.auth.signOut()
      await releaseInvitation()
      throw new HttpError(409, '家族連携を開始できませんでした。すでに連携済みの場合はログイン後にご確認ください。')
    }
    connectionId = inserted.id
  }

  await admin.auth.admin.updateUserById(invitation.invitee_user_id, {
    user_metadata: {
      ...(authUserData.user?.user_metadata ?? {}),
      pending_invitation_redirect: null,
      pending_invitation_kind: null,
    },
  })
  await writeAuditLog(authClient, invitation.invitee_user_id, 'accept_family_invitation', 'family_connection', connectionId)

  const needsOnboarding =
    !invitee.terms_accepted_at ||
    invitee.terms_version !== CURRENT_LEGAL_VERSION ||
    invitee.privacy_version !== CURRENT_LEGAL_VERSION
  sendJson(res, 200, { ok: true, next: needsOnboarding ? '/onboarding' : '/family' })
}

export default withErrorHandling(handler)
