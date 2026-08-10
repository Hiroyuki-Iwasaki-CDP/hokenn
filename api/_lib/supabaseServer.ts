import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { parse, serialize } from 'cookie'
import { requireEnv } from './env.js'

// セッションCookieの最大有効期間。この期間を過ぎると自動ログアウトとなり、
// 再度メールの認証コードでのログインが必要になる(要件: 「一定期間で再認証」)。
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14 // 14日

const COOKIE_OPTIONS: CookieOptionsWithName = {
  name: 'sb-hokenn-auth',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
  sameSite: 'lax',
  secure: true,
  httpOnly: true,
}

/**
 * リクエストごとのSupabaseクライアント(BFF専用)。
 * セッションはhttpOnly/Secure/SameSite=LaxのCookieに保存され、ブラウザのJSからは一切読めない。
 * getClaims()/getUser() 呼び出し時にアクセストークンの検証・必要に応じたリフレッシュトークンでの
 * サイレント更新が自動的に行われ、更新後のCookieは setAll 経由で res に書き戻される。
 */
export function createSupabaseServerClient(req: VercelRequest, res: VercelResponse) {
  const url = requireEnv('SUPABASE_URL')
  const anonKey = requireEnv('SUPABASE_ANON_KEY')

  return createServerClient(url, anonKey, {
    cookieOptions: COOKIE_OPTIONS,
    cookies: {
      getAll() {
        const header = req.headers.cookie
        if (!header) return []
        const parsed = parse(header)
        return Object.entries(parsed)
          .filter((entry): entry is [string, string] => entry[1] !== undefined)
          .map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        const existing = res.getHeader('Set-Cookie')
        const existingArr = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : []
        const newCookies = cookiesToSet.map(({ name, value, options }) => {
          const finalOptions = { ...COOKIE_OPTIONS, ...options }
          // @supabase/ssrは実際にセッションを書き込む際、cookieOptionsで渡したmaxAgeを無視して
          // 常に自前のデフォルト(400日、Chromeの上限いっぱい)で上書きする(ライブラリの仕様)。
          // それを検知して14日の上限を強制し直す。ただしCookie削除時(maxAge:0、ログアウト等)は
          // そのまま尊重しないと削除できなくなるため除外する。
          if (options.maxAge !== 0) {
            finalOptions.maxAge = SESSION_MAX_AGE_SECONDS
          }
          return serialize(name, value, finalOptions)
        })
        res.setHeader('Set-Cookie', [...existingArr, ...newCookies])
      },
    },
  })
}

/**
 * サービスロールキーを使う管理用クライアント。RLSを完全にバイパスするため、
 * 「顧客本人になり替わっての操作」には絶対に使わず、以下の限定的な用途にのみ使用する:
 *   - 退会処理でのauth.usersの完全削除(supabase.auth.admin.*)
 *   - rate_limit_events の読み書き(顧客データではない運用テーブル)
 * このクライアントはサーバーコードの外(ブラウザ)へは絶対に渡さない。
 */
export function createSupabaseAdminClient() {
  const url = requireEnv('SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
