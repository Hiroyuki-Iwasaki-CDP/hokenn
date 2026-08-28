import type { VercelRequest, VercelResponse } from '@vercel/node'
import { methodNotAllowed, sendJson, withErrorHandling } from '../../_lib/http.js'
import { getSessionUser } from '../../_lib/session.js'
import { CURRENT_LEGAL_VERSION } from '../../_lib/legal.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])

  const session = await getSessionUser(req, res)
  if (!session) {
    sendJson(res, 200, { authenticated: false })
    return
  }

  const { data: userRow } = await session.supabase
    .from('users')
    .select('display_name, manage_scope, terms_accepted_at, terms_version, privacy_version, role, advisor_id, is_operator')
    .eq('id', session.userId)
    .maybeSingle()

  sendJson(res, 200, {
    authenticated: true,
    needsOnboarding:
      !userRow?.terms_accepted_at ||
      userRow.terms_version !== CURRENT_LEGAL_VERSION ||
      userRow.privacy_version !== CURRENT_LEGAL_VERSION,
    user: {
      id: session.userId,
      email: session.email,
      displayName: userRow?.display_name ?? null,
      manageScope: userRow?.manage_scope ?? null,
      role: userRow?.role ?? 'customer',
      advisorId: userRow?.advisor_id ?? null,
      isOperator: userRow?.is_operator === true,
    },
  })
}

export default withErrorHandling(handler)
