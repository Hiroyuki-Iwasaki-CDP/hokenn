import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../_lib/http.js'
import { requireSessionUser } from '../_lib/session.js'
import { profileUpdateSchema } from '../_lib/validation.js'
import { writeAuditLog } from '../_lib/audit.js'
import { CURRENT_LEGAL_VERSION } from '../_lib/legal.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSessionUser(req, res)

  if (req.method === 'PUT') {
    assertTrustedOrigin(req)
    const input = profileUpdateSchema.parse(await readJsonBody(req))

    const { data, error } = await session.supabase
      .from('users')
      .update({
        display_name: input.displayName,
        manage_scope: input.manageScope ?? null,
        terms_accepted_at: new Date().toISOString(),
        terms_version: CURRENT_LEGAL_VERSION,
        privacy_version: CURRENT_LEGAL_VERSION,
      })
      .eq('id', session.userId)
      .select('display_name, manage_scope, terms_accepted_at, role, advisor_id, is_operator')
      .single()

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')

    await writeAuditLog(session.supabase, session.userId, 'update', 'user_profile')
    sendJson(res, 200, {
      user: {
        id: session.userId,
        email: session.email,
        displayName: data.display_name,
        manageScope: data.manage_scope,
        role: data.role,
        advisorId: data.advisor_id,
        isOperator: data.is_operator === true,
      },
    })
    return
  }

  methodNotAllowed(res, ['PUT'])
}

export default withErrorHandling(handler)
