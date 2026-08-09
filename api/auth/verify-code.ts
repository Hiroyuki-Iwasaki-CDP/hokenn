import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSupabaseServerClient } from '../_lib/supabaseServer'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../_lib/http'
import { verifyCodeSchema } from '../_lib/validation'
import { assertWithinRateLimit, recordRateLimitEvent, VERIFY_CODE_EMAIL_RULES } from '../_lib/rateLimit'
import { writeAuditLog } from '../_lib/audit'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
  assertTrustedOrigin(req)

  const body = verifyCodeSchema.parse(await readJsonBody(req))

  // 連続入力(総当たり)を防止する。制限を超えたら、正しいコードであっても一時的に拒否する。
  await assertWithinRateLimit(body.email, 'verify_code', VERIFY_CODE_EMAIL_RULES)
  await recordRateLimitEvent(body.email, 'verify_code')

  const supabase = createSupabaseServerClient(req, res)
  const { data, error } = await supabase.auth.verifyOtp({
    email: body.email,
    token: body.code,
    type: 'email',
  })

  if (error || !data.user) {
    // 期限切れ・再利用済み・誤りのいずれも同一の一般的なメッセージにする。
    throw new HttpError(400, '認証コードが正しくないか、有効期限が切れています。')
  }

  const userId = data.user.id
  const email = data.user.email ?? body.email

  // 初回ログイン時は public.users 行を作成する(RLSにより自分のidでのみ挿入可能)。
  const { data: userRow, error: upsertError } = await supabase
    .from('users')
    .upsert({ id: userId, email }, { onConflict: 'id', ignoreDuplicates: false })
    .select('terms_accepted_at, display_name')
    .single()

  if (upsertError) {
    throw new HttpError(500, 'サーバーエラーが発生しました。しばらくしてから再度お試しください。')
  }

  await writeAuditLog(supabase, userId, 'login', 'session')

  sendJson(res, 200, {
    ok: true,
    needsOnboarding: !userRow?.terms_accepted_at,
    user: { id: userId, email, displayName: userRow?.display_name ?? null },
  })
}

export default withErrorHandling(handler)
