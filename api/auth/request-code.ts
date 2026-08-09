import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSupabaseServerClient } from '../_lib/supabaseServer.js'
import { assertTrustedOrigin, clientIp, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../_lib/http.js'
import { requestCodeSchema } from '../_lib/validation.js'
import { assertWithinRateLimit, recordRateLimitEvent, REQUEST_CODE_EMAIL_RULES, REQUEST_CODE_IP_RULES } from '../_lib/rateLimit.js'

const GENERIC_RESPONSE = {
  ok: true,
  message: '入力されたメールアドレスが招待済みの場合、認証コードを送信しました。',
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
  assertTrustedOrigin(req)

  const body = requestCodeSchema.parse(await readJsonBody(req))
  const ip = clientIp(req)

  // 送信回数・再送間隔の制限。制限超過の場合のみ429を返す(これは列挙攻撃には寄与しない一般的な制限)。
  await assertWithinRateLimit(body.email, 'request_code', REQUEST_CODE_EMAIL_RULES)
  await assertWithinRateLimit(`ip:${ip}`, 'request_code', REQUEST_CODE_IP_RULES)
  await recordRateLimitEvent(body.email, 'request_code')
  await recordRateLimitEvent(`ip:${ip}`, 'request_code')

  const supabase = createSupabaseServerClient(req, res)
  // shouldCreateUser:false により、Supabaseダッシュボードで招待済みのメールアドレスにのみ実際にコードが送信される。
  // 未招待のメールアドレスの場合はSupabase側でエラーになるが、ここでは意図的に無視し、
  // 登録有無に関わらず常に同一のレスポンスを返す(要件: 登録済みかどうかを推測させない)。
  const { error } = await supabase.auth.signInWithOtp({
    email: body.email,
    options: { shouldCreateUser: false },
  })
  if (error) {
    // eslint-disable-next-line no-console
    console.info('[auth] signInWithOtp did not send an email', { status: error.status })
  }

  sendJson(res, 200, GENERIC_RESPONSE)
}

export default withErrorHandling(handler)
