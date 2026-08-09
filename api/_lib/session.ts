import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from './supabaseServer'
import { HttpError } from './http'

export interface SessionContext {
  userId: string
  email: string
  supabase: SupabaseClient
}

/**
 * Cookieから読み取ったセッションを検証し、認証済みユーザーIDをサーバー側で確定させる。
 * クライアントが送ってきた値(リクエストボディやクエリのuserId等)は一切参照しない。
 * トークンが期限切れの場合はリフレッシュトークンでの再検証を試み、成功すればCookieを更新する。
 * 失敗した場合は null を返す(呼び出し側で401を返すこと)。
 */
export async function getSessionUser(req: VercelRequest, res: VercelResponse): Promise<SessionContext | null> {
  const supabase = createSupabaseServerClient(req, res)
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return null

  const claims = data.claims as { sub?: string; email?: string }
  if (!claims.sub) return null

  return { userId: claims.sub, email: claims.email ?? '', supabase }
}

export async function requireSessionUser(req: VercelRequest, res: VercelResponse): Promise<SessionContext> {
  const session = await getSessionUser(req, res)
  if (!session) {
    throw new HttpError(401, 'ログインが必要です。')
  }
  return session
}
