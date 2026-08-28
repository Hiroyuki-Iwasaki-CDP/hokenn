import { createHash, randomBytes } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../../_lib/http.js'
import { requireCustomerSession } from '../../_lib/session.js'
import { createSupabaseAdminClient, createSupabaseAuthClient } from '../../_lib/supabaseServer.js'
import { familyActionSchema, inviteFamilySchema } from '../../_lib/validation.js'
import { writeAuditLog } from '../../_lib/audit.js'
import { requireEnv } from '../../_lib/env.js'

const INVITATION_VALID_DAYS = 7
const MAX_PENDING_INVITATIONS = 10
const MAX_DAILY_INVITATIONS = 20

function invitationHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireCustomerSession(req, res)
  const admin = createSupabaseAdminClient()

  if (req.method === 'GET') {
    const now = new Date().toISOString()
    const [{ data: connections, error: connectionError }, { data: invitations, error: invitationError }] = await Promise.all([
      admin
        .from('family_connections')
        .select('id, member_a_user_id, member_b_user_id, accepted_at, created_at')
        .or(`member_a_user_id.eq.${session.userId},member_b_user_id.eq.${session.userId}`)
        .is('revoked_at', null)
        .order('created_at', { ascending: false }),
      admin
        .from('family_invitations')
        .select('id, email, expires_at, created_at')
        .eq('inviter_user_id', session.userId)
        .is('accepted_at', null)
        .is('revoked_at', null)
        .gt('expires_at', now)
        .order('created_at', { ascending: false }),
    ])
    if (connectionError || invitationError) throw new HttpError(500, '家族連携情報を読み込めませんでした。')

    const memberIds = (connections ?? []).map((connection) =>
      connection.member_a_user_id === session.userId ? connection.member_b_user_id : connection.member_a_user_id,
    )
    const { data: members, error: memberError } = memberIds.length
      ? await admin
          .from('users')
          .select('id, email, display_name')
          .in('id', memberIds)
          .eq('role', 'customer')
          .eq('is_active', true)
          .is('deleted_at', null)
      : { data: [], error: null }
    if (memberError) throw new HttpError(500, '家族情報を読み込めませんでした。')
    const memberById = new Map((members ?? []).map((member) => [member.id, member] as const))

    sendJson(res, 200, {
      connections: (connections ?? []).flatMap((connection) => {
        const memberId = connection.member_a_user_id === session.userId ? connection.member_b_user_id : connection.member_a_user_id
        const member = memberById.get(memberId)
        return member
          ? [{ id: connection.id, memberId, displayName: member.display_name, email: member.email, linkedAt: connection.accepted_at }]
          : []
      }),
      pendingInvitations: (invitations ?? []).map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
      })),
    })
    return
  }

  if (req.method === 'POST') {
    assertTrustedOrigin(req)
    const input = inviteFamilySchema.parse(await readJsonBody(req))
    if (input.email === session.email.trim().toLowerCase()) throw new HttpError(400, '自分自身は家族に招待できません。')

    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const [{ count: pendingCount, error: pendingCountError }, { count: dailyCount, error: dailyCountError }] = await Promise.all([
      admin
        .from('family_invitations')
        .select('id', { count: 'exact', head: true })
        .eq('inviter_user_id', session.userId)
        .is('accepted_at', null)
        .is('revoked_at', null)
        .gt('expires_at', now.toISOString()),
      admin
        .from('family_invitations')
        .select('id', { count: 'exact', head: true })
        .eq('inviter_user_id', session.userId)
        .gte('created_at', dayAgo),
    ])
    if (pendingCountError || dailyCountError) throw new HttpError(500, '招待回数を確認できませんでした。')
    if ((pendingCount ?? 0) >= MAX_PENDING_INVITATIONS || (dailyCount ?? 0) >= MAX_DAILY_INVITATIONS) {
      throw new HttpError(429, '招待回数の上限に達しました。不要な招待を取り消すか、時間をおいてお試しください。')
    }

    const { data: existing, error: existingError } = await admin
      .from('users')
      .select('id, role, is_active, deleted_at')
      .eq('email', input.email)
      .maybeSingle()
    if (existingError) throw new HttpError(500, '招待先を確認できませんでした。')
    if (existing?.role === 'advisor') throw new HttpError(400, '担当者アカウントは家族に招待できません。')
    if (existing && (existing.is_active !== true || existing.deleted_at !== null)) {
      throw new HttpError(400, 'このアカウントは現在利用できません。')
    }

    if (existing) {
      const [memberA, memberB] = [session.userId, existing.id].sort()
      const { count } = await admin
        .from('family_connections')
        .select('id', { count: 'exact', head: true })
        .eq('member_a_user_id', memberA)
        .eq('member_b_user_id', memberB)
        .is('revoked_at', null)
      if ((count ?? 0) > 0) throw new HttpError(409, 'この方とはすでに家族連携しています。')
    }

    const rawToken = randomBytes(32).toString('base64url')
    const expiresAt = new Date(now.getTime() + INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const inviteUrl = `${requireEnv('ALLOWED_ORIGIN')}/family/invite?token=${encodeURIComponent(rawToken)}`

    await admin
      .from('family_invitations')
      .update({ revoked_at: now.toISOString() })
      .eq('inviter_user_id', session.userId)
      .eq('email', input.email)
      .is('accepted_at', null)
      .is('revoked_at', null)

    const { data: invitation, error: invitationError } = await admin
      .from('family_invitations')
      .insert({
        inviter_user_id: session.userId,
        invitee_user_id: existing?.id ?? null,
        email: input.email,
        token_hash: invitationHash(rawToken),
        expires_at: expiresAt,
      })
      .select('id')
      .single()
    if (invitationError || !invitation) throw new HttpError(500, '家族招待を作成できませんでした。')

    let targetUserId = existing?.id
    let createdByInvitation = false
    if (!targetUserId) {
      const { data: created, error: createError } = await admin.auth.admin.inviteUserByEmail(input.email, {
        redirectTo: inviteUrl,
        data: { account_role: 'family' },
      })
      if (createError || !created.user) {
        await admin.from('family_invitations').update({ revoked_at: now.toISOString() }).eq('id', invitation.id)
        throw new HttpError(502, '招待メールを送信できませんでした。しばらくしてから再度お試しください。')
      }
      targetUserId = created.user.id
      createdByInvitation = true
      const { error: upsertError } = await admin
        .from('users')
        .upsert({ id: targetUserId, email: input.email, role: 'customer', invitation_provisioned: true }, { onConflict: 'id' })
      if (upsertError) {
        await admin.auth.admin.deleteUser(targetUserId)
        await admin.from('family_invitations').update({ revoked_at: now.toISOString() }).eq('id', invitation.id)
        throw new HttpError(500, '家族アカウントを準備できませんでした。')
      }
    }

    const { error: linkError } = await admin.from('family_invitations').update({ invitee_user_id: targetUserId }).eq('id', invitation.id)
    if (linkError) {
      if (createdByInvitation) await admin.auth.admin.deleteUser(targetUserId)
      await admin.from('family_invitations').update({ revoked_at: now.toISOString() }).eq('id', invitation.id)
      throw new HttpError(500, '家族招待を紐づけできませんでした。')
    }

    if (existing) {
      const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(targetUserId)
      if (authUserError || !authUserData.user) {
        await admin.from('family_invitations').update({ revoked_at: now.toISOString() }).eq('id', invitation.id)
        throw new HttpError(500, '招待先アカウントを確認できませんでした。')
      }
      const { error: metadataError } = await admin.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...(authUserData.user.user_metadata ?? {}),
          pending_invitation_redirect: inviteUrl,
          pending_invitation_kind: 'family',
        },
      })
      if (metadataError) {
        await admin.from('family_invitations').update({ revoked_at: now.toISOString() }).eq('id', invitation.id)
        throw new HttpError(500, '家族招待メールを準備できませんでした。')
      }
      const authClient = createSupabaseAuthClient()
      const { error: emailError } = await authClient.auth.signInWithOtp({
        email: input.email,
        options: { shouldCreateUser: false, emailRedirectTo: inviteUrl },
      })
      if (emailError) {
        await admin.from('family_invitations').update({ revoked_at: now.toISOString() }).eq('id', invitation.id)
        throw new HttpError(502, '招待メールを送信できませんでした。30秒以上待ってからもう一度お試しください。')
      }
    }

    await writeAuditLog(session.supabase, session.userId, 'invite_family', 'family_invitation', invitation.id)
    sendJson(res, 201, { ok: true, expiresAt })
    return
  }

  if (req.method === 'DELETE') {
    assertTrustedOrigin(req)
    const input = familyActionSchema.parse(await readJsonBody(req))
    const revokedAt = new Date().toISOString()

    if (input.action === 'connection') {
      const { data, error } = await admin
        .from('family_connections')
        .update({ revoked_at: revokedAt })
        .eq('id', input.id)
        .or(`member_a_user_id.eq.${session.userId},member_b_user_id.eq.${session.userId}`)
        .is('revoked_at', null)
        .select('id')
        .maybeSingle()
      if (error) throw new HttpError(500, '家族連携を解除できませんでした。')
      if (!data) throw new HttpError(404, '家族連携が見つからないか、すでに解除されています。')
      await writeAuditLog(session.supabase, session.userId, 'revoke_family_connection', 'family_connection', input.id)
      sendJson(res, 200, { ok: true })
      return
    }

    const { data, error } = await admin
      .from('family_invitations')
      .update({ revoked_at: revokedAt })
      .eq('id', input.id)
      .eq('inviter_user_id', session.userId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .select('id, invitee_user_id')
      .maybeSingle()
    if (error) throw new HttpError(500, '家族招待を取り消せませんでした。')
    if (!data) throw new HttpError(404, '家族招待が見つからないか、すでに利用されています。')

    if (data.invitee_user_id) {
      const [{ data: user }, { count: familyInviteCount }, { count: advisorInviteCount }, { count: connectionCount }] = await Promise.all([
        admin.from('users').select('invitation_provisioned, terms_accepted_at').eq('id', data.invitee_user_id).maybeSingle(),
        admin
          .from('family_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('invitee_user_id', data.invitee_user_id)
          .is('accepted_at', null)
          .is('revoked_at', null)
          .gt('expires_at', revokedAt),
        admin
          .from('customer_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('customer_user_id', data.invitee_user_id)
          .is('accepted_at', null)
          .is('revoked_at', null)
          .gt('expires_at', revokedAt),
        admin
          .from('family_connections')
          .select('id', { count: 'exact', head: true })
          .or(`member_a_user_id.eq.${data.invitee_user_id},member_b_user_id.eq.${data.invitee_user_id}`)
          .is('revoked_at', null),
      ])
      if (user?.invitation_provisioned && !user.terms_accepted_at && (familyInviteCount ?? 0) === 0 && (advisorInviteCount ?? 0) === 0 && (connectionCount ?? 0) === 0) {
        await admin.auth.admin.deleteUser(data.invitee_user_id)
      }
    }

    await writeAuditLog(session.supabase, session.userId, 'revoke_family_invitation', 'family_invitation', input.id)
    sendJson(res, 200, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'POST', 'DELETE'])
}

export default withErrorHandling(handler)
