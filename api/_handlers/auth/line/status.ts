import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, sendJson, withErrorHandling } from '../../../_lib/http.js'
import { isLineConfigured } from '../../../_lib/lineOAuth.js'
import { requireSessionUser } from '../../../_lib/session.js'
import { writeAuditLog } from '../../../_lib/audit.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSessionUser(req, res)

  if (req.method === 'GET') {
    const { data, error } = await session.supabase
      .from('users')
      .select('line_user_id, line_display_name, line_linked_at')
      .eq('id', session.userId)
      .single()

    if (error) throw new HttpError(500, 'LINE連携状態を確認できませんでした。')
    sendJson(res, 200, {
      configured: isLineConfigured(),
      linked: !!data.line_user_id,
      displayName: data.line_display_name ?? null,
      linkedAt: data.line_linked_at ?? null,
    })
    return
  }

  if (req.method === 'DELETE') {
    assertTrustedOrigin(req)
    const { error } = await session.supabase
      .from('users')
      .update({ line_user_id: null, line_display_name: null, line_linked_at: null })
      .eq('id', session.userId)
    if (error) throw new HttpError(500, 'LINE連携を解除できませんでした。')

    await writeAuditLog(session.supabase, session.userId, 'line_unlink', 'user')
    sendJson(res, 200, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'DELETE'])
}

export default withErrorHandling(handler)
