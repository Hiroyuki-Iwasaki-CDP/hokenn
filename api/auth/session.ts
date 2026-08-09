import type { VercelRequest, VercelResponse } from '@vercel/node'
import { methodNotAllowed, sendJson, withErrorHandling } from '../_lib/http'
import { getSessionUser } from '../_lib/session'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])

  const session = await getSessionUser(req, res)
  if (!session) {
    sendJson(res, 200, { authenticated: false })
    return
  }

  const { data: userRow } = await session.supabase
    .from('users')
    .select('display_name, manage_scope, terms_accepted_at')
    .eq('id', session.userId)
    .maybeSingle()

  sendJson(res, 200, {
    authenticated: true,
    needsOnboarding: !userRow?.terms_accepted_at,
    user: {
      id: session.userId,
      email: session.email,
      displayName: userRow?.display_name ?? null,
      manageScope: userRow?.manage_scope ?? null,
    },
  })
}

export default withErrorHandling(handler)
