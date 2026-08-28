import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSupabaseServerClient } from './supabaseServer.js'
import { HttpError } from './http.js'

// SupabaseClient型を@supabase/supabase-jsから直接importせず、実際にクライアントを生成する
// 関数から導出する。@supabase/ssr経由の型と直接importした型が、Vercelのビルド環境では
// モジュール解決モードの違いにより「同じクラスなのに別の型」と判定されることがあるため。
export type AppSupabaseClient = ReturnType<typeof createSupabaseServerClient>

export interface SessionContext {
  userId: string
  email: string
  supabase: AppSupabaseClient
}

/**
 * Cookieから読み取ったセッションを検証し、認証済みユーザーIDをサーバー側で確定させる。
 * クライアントが送ってきた値(リクエストボディやクエリのuserId等)は一切参照しない。
 * トークンが期限切れの場合はリフレッシュトークンでの再検証を試み、成功すればCookieを更新する。
 * 失敗した場合は null を返す(呼び出し側で401を返すこと)。
 *
 * getClaims()ではなくgetUser()を使う: このプロジェクトは非対称鍵(ES256)でJWTを署名しており、
 * getClaims()は署名検証のみのローカル判定になるため、ログアウトでSupabase側のセッションが
 * 失効していてもアクセストークンの有効期限内は誤って有効と判定されてしまう。getUser()は
 * Supabase Authサーバーへ問い合わせて失効を確認するため、ログアウト後は即座に401にできる。
 */
export async function getSessionUser(req: VercelRequest, res: VercelResponse): Promise<SessionContext | null> {
  const supabase = createSupabaseServerClient(req, res)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null

  const { data: userStatus, error: statusError } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', data.user.id)
    .maybeSingle()
  if (statusError || userStatus?.is_active === false) return null

  return { userId: data.user.id, email: data.user.email ?? '', supabase }
}

export async function requireSessionUser(req: VercelRequest, res: VercelResponse): Promise<SessionContext> {
  const session = await getSessionUser(req, res)
  if (!session) {
    throw new HttpError(401, 'ログインが必要です。')
  }
  return session
}

export interface AdvisorSessionContext extends SessionContext {
  role: 'advisor'
}

export interface OperatorSessionContext extends AdvisorSessionContext {
  isOperator: true
}

/**
 * FP専用エンドポイント向け。通常のセッション確認に加えて role='advisor' であることを
 * 確認する(顧客アカウントがFP用APIを呼べないようにするため)。
 * role列挙は毎回DBに問い合わせるため、この確認が必要なFP専用エンドポイントでのみ使う。
 */
export async function requireAdvisorSession(req: VercelRequest, res: VercelResponse): Promise<AdvisorSessionContext> {
  const session = await requireSessionUser(req, res)
  const { data, error } = await session.supabase.from('users').select('role').eq('id', session.userId).maybeSingle()
  if (error || data?.role !== 'advisor') {
    throw new HttpError(403, 'この操作は担当者アカウントでのみ行えます。')
  }
  return { ...session, role: 'advisor' }
}

export async function requireOperatorSession(req: VercelRequest, res: VercelResponse): Promise<OperatorSessionContext> {
  const session = await requireSessionUser(req, res)
  const { data, error } = await session.supabase
    .from('users')
    .select('role, is_operator, is_active')
    .eq('id', session.userId)
    .maybeSingle()
  if (error || data?.role !== 'advisor' || data.is_operator !== true || data.is_active !== true) {
    throw new HttpError(403, 'この操作は運営者アカウントでのみ行えます。')
  }
  return { ...session, role: 'advisor', isOperator: true }
}
