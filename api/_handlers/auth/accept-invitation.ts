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
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
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
    .select('id, advisor_user_id, customer_user_id, email')
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
    .select('terms_accepted_at, terms_version, privacy_version')
    .eq('id', invitation.customer_user_id)
    .eq('role', 'customer')
    .eq('advisor_id', invitation.advisor_user_id)
    .single()

  if (userError) {
    await releaseInvitation()
    throw new HttpError(500, '顧客情報を確認できませんでした。')
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

  await writeAuditLog(authClient, invitation.customer_user_id, 'accept_invitation', 'advisor', invitation.advisor_user_id)

  const needsOnboarding =
    !userRow.terms_accepted_at ||
    userRow.terms_version !== CURRENT_LEGAL_VERSION ||
    userRow.privacy_version !== CURRENT_LEGAL_VERSION

  sendJson(res, 200, { ok: true, next: needsOnboarding ? '/onboarding' : '/' })
}

export default withErrorHandling(handler)
