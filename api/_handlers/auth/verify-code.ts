import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSupabaseServerClient } from '../../_lib/supabaseServer.js'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../../_lib/http.js'
import { verifyCodeSchema } from '../../_lib/validation.js'
import { assertWithinRateLimit, recordRateLimitEvent, VERIFY_CODE_EMAIL_RULES } from '../../_lib/rateLimit.js'
import { writeAuditLog } from '../../_lib/audit.js'
import { CURRENT_LEGAL_VERSION } from '../../_lib/legal.js'

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
  // role/advisor_idは指定しない(既存行なら維持、新規行ならDBのデフォルト値'customer'が入る)。
  // FPアカウントへの昇格はSupabaseダッシュボード側で手動で行う運用のため、ここでは絶対に
  // クライアント入力からroleを受け取らない。
  const { data: userRow, error: upsertError } = await supabase
    .from('users')
    .upsert({ id: userId, email }, { onConflict: 'id', ignoreDuplicates: false })
    .select('terms_accepted_at, terms_version, privacy_version, display_name, role, advisor_id, is_operator, is_active')
    .single()

  if (upsertError) {
    throw new HttpError(500, 'サーバーエラーが発生しました。しばらくしてから再度お試しください。')
  }
  if (userRow.is_active === false) {
    await supabase.auth.signOut()
    throw new HttpError(403, 'このアカウントは現在利用停止中です。運営へお問い合わせください。')
  }

  await writeAuditLog(supabase, userId, 'login', 'session')

  sendJson(res, 200, {
    ok: true,
    needsOnboarding:
      !userRow?.terms_accepted_at ||
      userRow.terms_version !== CURRENT_LEGAL_VERSION ||
      userRow.privacy_version !== CURRENT_LEGAL_VERSION,
    user: {
      id: userId,
      email,
      displayName: userRow?.display_name ?? null,
      role: userRow?.role ?? 'customer',
      advisorId: userRow?.advisor_id ?? null,
      isOperator: userRow?.is_operator === true,
    },
  })
}

export default withErrorHandling(handler)
