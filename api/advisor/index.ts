import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../_lib/http.js'
import { requireSessionUser } from '../_lib/session.js'
import { advisorProfileSchema } from '../_lib/validation.js'
import { advisorInputToRow, advisorRowToApi, type AdvisorRow } from '../_lib/mappers.js'
import { writeAuditLog } from '../_lib/audit.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSessionUser(req, res)

  if (req.method === 'GET') {
    const { data, error } = await session.supabase
      .from('advisor_profiles')
      .select('advisor_name, agency_name, title, phone, email, official_line_url, contact_hours, is_accepting_inquiries')
      .eq('owner_user_id', session.userId)
      .maybeSingle()

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')
    sendJson(res, 200, { advisor: advisorRowToApi(data as AdvisorRow | null) })
    return
  }

  if (req.method === 'PUT') {
    assertTrustedOrigin(req)
    const input = advisorProfileSchema.parse(await readJsonBody(req))
    const row = advisorInputToRow(input)

    const { data, error } = await session.supabase
      .from('advisor_profiles')
      .upsert({ ...row, owner_user_id: session.userId }, { onConflict: 'owner_user_id' })
      .select('advisor_name, agency_name, title, phone, email, official_line_url, contact_hours, is_accepting_inquiries')
      .single()

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')

    await writeAuditLog(session.supabase, session.userId, 'update', 'advisor_profile')
    sendJson(res, 200, { advisor: advisorRowToApi(data as AdvisorRow) })
    return
  }

  methodNotAllowed(res, ['GET', 'PUT'])
}

export default withErrorHandling(handler)
