import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, methodNotAllowed, withErrorHandling } from '../../../_lib/http.js'
import { requireSessionUser } from '../../../_lib/session.js'
import { writeAuditLog } from '../../../_lib/audit.js'
import {
  clearLineOAuthCookies,
  getLineConfig,
  getRequestCookie,
  LINE_NONCE_COOKIE,
  LINE_STATE_COOKIE,
  LINE_VERIFIER_COOKIE,
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

  if (!code || !nonce || !verifier || !safeStringEqual(returnedState, storedState)) {
    res.redirect(302, settingsRedirect('error', 'invalid_request'))
    return
  }

  const session = await requireSessionUser(req, res)
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
    res.redirect(302, settingsRedirect('error', 'token_exchange_failed'))
    return
  }

  const tokens = (await tokenResponse.json()) as LineTokenResponse
  if (!tokens.id_token) {
    res.redirect(302, settingsRedirect('error', 'missing_id_token'))
    return
  }

  const verifyResponse = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: tokens.id_token, client_id: config.channelId, nonce }),
  })

  if (!verifyResponse.ok) {
    res.redirect(302, settingsRedirect('error', 'verification_failed'))
    return
  }

  const identity = (await verifyResponse.json()) as LineIdTokenPayload
  if (!identity.sub || !/^U[0-9a-f]{32}$/.test(identity.sub)) {
    res.redirect(302, settingsRedirect('error', 'invalid_user'))
    return
  }

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
