import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { parse, serialize } from 'cookie'
import { optionalEnv, requireEnv } from './env.js'

export const LINE_STATE_COOKIE = 'hokenn-line-state'
export const LINE_NONCE_COOKIE = 'hokenn-line-nonce'
export const LINE_VERIFIER_COOKIE = 'hokenn-line-verifier'

const OAUTH_COOKIE_PATH = '/api/auth/line'
const OAUTH_MAX_AGE_SECONDS = 10 * 60

function base64Url(input: Buffer): string {
  return input.toString('base64url')
}

export function createLineOAuthValues() {
  const state = base64Url(randomBytes(32))
  const nonce = base64Url(randomBytes(32))
  const verifier = base64Url(randomBytes(64))
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { state, nonce, verifier, challenge }
}

export function getLineConfig() {
  return {
    channelId: requireEnv('LINE_LOGIN_CHANNEL_ID'),
    channelSecret: requireEnv('LINE_LOGIN_CHANNEL_SECRET'),
    callbackUrl: requireEnv('LINE_LOGIN_CALLBACK_URL'),
  }
}

export function isLineConfigured(): boolean {
  return !!(
    optionalEnv('LINE_LOGIN_CHANNEL_ID') &&
    optionalEnv('LINE_LOGIN_CHANNEL_SECRET') &&
    optionalEnv('LINE_LOGIN_CALLBACK_URL')
  )
}

export function buildLineAuthorizeUrl(
  config: ReturnType<typeof getLineConfig>,
  values: ReturnType<typeof createLineOAuthValues>,
): string {
  const url = new URL('https://access.line.me/oauth2/v2.1/authorize')
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.channelId,
    redirect_uri: config.callbackUrl,
    state: values.state,
    scope: 'openid profile',
    nonce: values.nonce,
    code_challenge: values.challenge,
    code_challenge_method: 'S256',
    bot_prompt: 'normal',
  }).toString()
  return url.toString()
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax' as const,
    path: OAUTH_COOKIE_PATH,
    maxAge,
  }
}

export function setLineOAuthCookies(res: VercelResponse, values: ReturnType<typeof createLineOAuthValues>) {
  appendSetCookies(res, [
    serialize(LINE_STATE_COOKIE, values.state, cookieOptions(OAUTH_MAX_AGE_SECONDS)),
    serialize(LINE_NONCE_COOKIE, values.nonce, cookieOptions(OAUTH_MAX_AGE_SECONDS)),
    serialize(LINE_VERIFIER_COOKIE, values.verifier, cookieOptions(OAUTH_MAX_AGE_SECONDS)),
  ])
}

export function clearLineOAuthCookies(res: VercelResponse) {
  appendSetCookies(res, [
    serialize(LINE_STATE_COOKIE, '', cookieOptions(0)),
    serialize(LINE_NONCE_COOKIE, '', cookieOptions(0)),
    serialize(LINE_VERIFIER_COOKIE, '', cookieOptions(0)),
  ])
}

function appendSetCookies(res: VercelResponse, cookies: string[]) {
  const existing = res.getHeader('Set-Cookie')
  const existingCookies = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : []
  res.setHeader('Set-Cookie', [...existingCookies, ...cookies])
}

export function getRequestCookie(req: VercelRequest, name: string): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  return parse(header)[name]
}

export function safeStringEqual(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function settingsRedirect(result: 'linked' | 'error', reason?: string): string {
  const origin = requireEnv('ALLOWED_ORIGIN')
  const url = new URL('/settings', origin)
  url.searchParams.set('line', result)
  if (reason) url.searchParams.set('reason', reason)
  return url.toString()
}
