import { createHmac } from 'node:crypto'
import { createSupabaseAdminClient } from './supabaseServer.js'
import { requireEnv } from './env.js'
import { HttpError } from './http.js'

type RateLimitAction = 'request_code' | 'verify_code' | 'line_test_notification'

interface RateLimitRule {
  windowSeconds: number
  max: number
}

// メール送信・認証コード検証それぞれの制限。要件の「送信回数・再送間隔・入力試行回数」に対応する。
export const REQUEST_CODE_EMAIL_RULES: RateLimitRule[] = [
  { windowSeconds: 60, max: 1 }, // 再送は最短60秒間隔
  { windowSeconds: 15 * 60, max: 3 }, // 同一メール 15分に3回まで
  { windowSeconds: 24 * 60 * 60, max: 8 }, // 同一メール 24時間に8回まで
]
export const REQUEST_CODE_IP_RULES: RateLimitRule[] = [{ windowSeconds: 60 * 60, max: 15 }] // 同一IP 1時間に15回まで

export const VERIFY_CODE_EMAIL_RULES: RateLimitRule[] = [{ windowSeconds: 15 * 60, max: 5 }] // 同一メール 15分に5回まで試行
export const LINE_TEST_NOTIFICATION_RULES: RateLimitRule[] = [
  { windowSeconds: 60 * 60, max: 3 },
  { windowSeconds: 24 * 60 * 60, max: 10 },
]

function hashSubject(subject: string): string {
  const secret = requireEnv('RATE_LIMIT_HASH_SECRET')
  return createHmac('sha256', secret).update(subject.trim().toLowerCase()).digest('hex')
}

/**
 * ルールを超えていれば429を投げる。超えていなければ何もしない(記録はrecordRateLimitEventで別途行う)。
 */
export async function assertWithinRateLimit(
  subject: string,
  action: RateLimitAction,
  rules: RateLimitRule[],
): Promise<void> {
  const admin = createSupabaseAdminClient()
  const subjectHash = hashSubject(subject)
  const now = Date.now()

  for (const rule of rules) {
    const since = new Date(now - rule.windowSeconds * 1000).toISOString()
    const { count, error } = await admin
      .from('rate_limit_events')
      .select('id', { count: 'exact', head: true })
      .eq('subject_hash', subjectHash)
      .eq('action', action)
      .gte('created_at', since)

    if (error) {
      throw new HttpError(500, 'サーバーエラーが発生しました。しばらくしてから再度お試しください。')
    }
    if ((count ?? 0) >= rule.max) {
      throw new HttpError(429, 'しばらく時間をおいてから再度お試しください。')
    }
  }
}

export async function recordRateLimitEvent(subject: string, action: RateLimitAction): Promise<void> {
  const admin = createSupabaseAdminClient()
  const subjectHash = hashSubject(subject)
  await admin.from('rate_limit_events').insert({ subject_hash: subjectHash, action })
}
