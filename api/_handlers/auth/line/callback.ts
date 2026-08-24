import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, methodNotAllowed, withErrorHandling } from '../../../_lib/http.js'
import { requireSessionUser } from '../../../_lib/session.js'
import { createSupabaseAdminClient, createSupabaseServerClient } from '../../../_lib/supabaseServer.js'
import { writeAuditLog } from '../../../_lib/audit.js'
import {
  clearLineOAuthCookies,
  getLineConfig,
  getRequestCookie,
  LINE_FLOW_COOKIE,
  LINE_NONCE_COOKIE,
  LINE_NEXT_COOKIE,
  LINE_STATE_COOKIE,
  LINE_VERIFIER_COOKIE,
  lineEntryRedirect,
  safeStringEqual,
  settingsRedirect,
} from '../../../_lib/lineOAuth.js'

interface LineTokenResponse {
  access_token?: string
  id_token?: string
}

interface LineIdTokenPayload {
  sub?: string
  name?: string
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
  clearLineOAuthCookies(res)

  const code = typeof req.query.code === 'string' ? req.query.code : undefined
  const returnedState = typeof req.query.state === 'string' ? req.query.state : undefined
  const storedState = getRequestCookie(req, LINE_STATE_COOKIE)
  const nonce = getRequestCookie(req, LINE_NONCE_COOKIE)
  const verifier = getRequestCookie(req, LINE_VERIFIER_COOKIE)
  const flow = getRequestCookie(req, LINE_FLOW_COOKIE)
  const next = getRequestCookie(req, LINE_NEXT_COOKIE) === 'consultation' ? 'consultation' : 'home'

  const errorRedirect = (reason: string) =>
    flow === 'login' ? lineEntryRedirect('error', reason, next) : settingsRedirect('error', reason)

  if ((flow !== 'link' && flow !== 'login') || !code || !nonce || !verifier || !safeStringEqual(returnedState, storedState)) {
    res.redirect(302, errorRedirect('invalid_request'))
    return
  }

  const config = getLineConfig()

  const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.callbackUrl,
      client_id: config.channelId,
      client_secret: config.channelSecret,
      code_verifier: verifier,
    }),
  })

  if (!tokenResponse.ok) {
    res.redirect(302, errorRedirect('token_exchange_failed'))
    return
  }

  const tokens = (await tokenResponse.json()) as LineTokenResponse
  if (!tokens.id_token) {
    res.redirect(302, errorRedirect('missing_id_token'))
    return
  }

  const verifyResponse = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: tokens.id_token, client_id: config.channelId, nonce }),
  })

  if (!verifyResponse.ok) {
    res.redirect(302, errorRedirect('verification_failed'))
    return
  }

  const identity = (await verifyResponse.json()) as LineIdTokenPayload
  if (!identity.sub || !/^U[0-9a-f]{32}$/.test(identity.sub)) {
    res.redirect(302, errorRedirect('invalid_user'))
    return
  }

  if (flow === 'login') {
    const admin = createSupabaseAdminClient()
    const { data: linkedUser, error: lookupError } = await admin
      .from('users')
      .select('id, email')
      .eq('line_user_id', identity.sub)
      .maybeSingle()

    if (lookupError) throw new HttpError(500, 'LINE連携情報を確認できませんでした。')
    if (!linkedUser?.email) {
      res.redirect(302, lineEntryRedirect('error', 'not_linked'))
      return
    }

    // LINE IDから特定できた既存の招待済みユーザーにだけ、通常のSupabaseセッションを発行する。
    // トークンはサーバー内で即時交換し、メール送信や新規ユーザー作成は行わない。
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: linkedUser.email,
    })
    const tokenHash = linkData?.properties?.hashed_token
    if (linkError || !tokenHash) {
      res.redirect(302, lineEntryRedirect('error', 'session_failed'))
      return
    }

    const supabase = createSupabaseServerClient(req, res)
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    })
    if (authError || authData.user?.id !== linkedUser.id) {
      await supabase.auth.signOut()
      res.redirect(302, lineEntryRedirect('error', 'session_failed'))
      return
    }

    await writeAuditLog(supabase, linkedUser.id, 'line_login', 'session')
    res.setHeader('Cache-Control', 'no-store')
    res.redirect(302, lineEntryRedirect('logged_in', undefined, next))
    return
  }

  const session = await requireSessionUser(req, res)

  const { error } = await session.supabase
    .from('users')
    .update({
      line_user_id: identity.sub,
      line_display_name: identity.name?.slice(0, 100) || null,
      line_linked_at: new Date().toISOString(),
    })
    .eq('id', session.userId)

  if (error) {
    if (error.code === '23505') {
      res.redirect(302, settingsRedirect('error', 'already_linked'))
      return
    }
    throw new HttpError(500, 'LINEアカウントを連携できませんでした。')
  }

  await writeAuditLog(session.supabase, session.userId, 'line_link', 'user')
  res.setHeader('Cache-Control', 'no-store')
  res.redirect(302, settingsRedirect('linked'))
}

export default withErrorHandling(handler)
