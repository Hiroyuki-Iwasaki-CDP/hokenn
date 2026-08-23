import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSupabaseServerClient } from '../../_lib/supabaseServer.js'
import { assertTrustedOrigin, methodNotAllowed, sendJson, withErrorHandling } from '../../_lib/http.js'
import { getSessionUser } from '../../_lib/session.js'
import { writeAuditLog } from '../../_lib/audit.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
  assertTrustedOrigin(req)

  const session = await getSessionUser(req, res)
  const supabase = session?.supabase ?? createSupabaseServerClient(req, res)
  if (session) {
    await writeAuditLog(session.supabase, session.userId, 'logout', 'session')
  }

  // リフレッシュトークンをSupabase側で無効化し、Cookieを削除する。
  await supabase.auth.signOut()

  sendJson(res, 200, { ok: true })
}

export default withErrorHandling(handler)
