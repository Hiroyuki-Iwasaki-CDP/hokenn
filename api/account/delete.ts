import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, sendJson, withErrorHandling } from '../_lib/http'
import { requireSessionUser } from '../_lib/session'
import { createSupabaseAdminClient } from '../_lib/supabaseServer'
import { writeAuditLog } from '../_lib/audit'

/**
 * 退会処理。
 * auth.users からアカウントを完全に削除する(service roleキーでのみ実行可能。ここでのみ管理用
 * クライアントを使う)。public.users / insurance_policies / advisor_profiles は
 * 外部キーの ON DELETE CASCADE により連動して即時に完全削除される。
 * audit_logs は owner_user_id が ON DELETE SET NULL のため、個人データを含まない
 * 操作履歴として残る(要件: 削除済みデータの取り扱いを明確にする)。
 * 個別の保険1件のみを削除する場合(DELETE /api/policies/:id)はソフトデリートだが、
 * 退会(アカウント削除)は即時かつ完全に削除される。
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
  assertTrustedOrigin(req)

  const session = await requireSessionUser(req, res)
  await writeAuditLog(session.supabase, session.userId, 'account_delete', 'user')

  const admin = createSupabaseAdminClient()
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(session.userId)
  if (deleteAuthError) throw new HttpError(500, 'サーバーエラーが発生しました。')

  await session.supabase.auth.signOut()
  sendJson(res, 200, { ok: true })
}

export default withErrorHandling(handler)
