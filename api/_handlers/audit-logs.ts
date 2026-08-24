import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, methodNotAllowed, sendJson, withErrorHandling } from '../_lib/http.js'
import { requireSessionUser } from '../_lib/session.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
  const session = await requireSessionUser(req, res)
  const { data, error } = await session.supabase
    .from('audit_logs')
    .select('id, action, resource_type, created_at')
    .eq('owner_user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new HttpError(500, '操作履歴を読み込めませんでした。')
  sendJson(res, 200, {
    logs: (data ?? []).map((row) => ({ id: row.id, action: row.action, resourceType: row.resource_type, createdAt: row.created_at })),
  })
}

export default withErrorHandling(handler)
