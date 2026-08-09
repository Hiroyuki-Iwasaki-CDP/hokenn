import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../_lib/http.js'
import { requireSessionUser } from '../_lib/session.js'
import { policyInputSchema } from '../_lib/validation.js'
import { policyInputToRow, policyRowToApi, type PolicyRow } from '../_lib/mappers.js'
import { writeAuditLog } from '../_lib/audit.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSessionUser(req, res)

  if (req.method === 'GET') {
    // owner_user_id はセッションから確定した値のみで絞り込む。RLSも同条件で二重に強制する。
    const { data, error } = await session.supabase
      .from('insurance_policies')
      .select('*')
      .eq('owner_user_id', session.userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')
    sendJson(res, 200, { policies: (data as PolicyRow[]).map(policyRowToApi) })
    return
  }

  if (req.method === 'POST') {
    assertTrustedOrigin(req)
    const input = policyInputSchema.parse(await readJsonBody(req))
    const row = policyInputToRow(input)

    const { data, error } = await session.supabase
      .from('insurance_policies')
      // owner_user_id はリクエストボディの値を一切使わず、サーバーが確定したuserIdを常に使う。
      .insert({ ...row, owner_user_id: session.userId })
      .select('*')
      .single()

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')

    await writeAuditLog(session.supabase, session.userId, 'create', 'insurance_policy', data.id)
    sendJson(res, 201, { policy: policyRowToApi(data as PolicyRow) })
    return
  }

  methodNotAllowed(res, ['GET', 'POST'])
}

export default withErrorHandling(handler)
