import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../_lib/http.js'
import { requireSessionUser } from '../_lib/session.js'
import { policyInputSchema } from '../_lib/validation.js'
import { policyInputToRow, policyRowToApi, riderInputsToRows, type PolicyRow } from '../_lib/mappers.js'
import { writeAuditLog } from '../_lib/audit.js'

const POLICY_SELECT = '*, riders:policy_riders(*)'

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSessionUser(req, res)

  if (req.method === 'GET') {
    // owner_user_id はセッションから確定した値のみで絞り込む。RLSも同条件で二重に強制する。
    const { data, error } = await session.supabase
      .from('insurance_policies')
      .select(POLICY_SELECT)
      .eq('owner_user_id', session.userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')
    sendJson(res, 200, { policies: (data as unknown as PolicyRow[]).map(policyRowToApi) })
    return
  }

  if (req.method === 'POST') {
    assertTrustedOrigin(req)
    const input = policyInputSchema.parse(await readJsonBody(req))
    const row = policyInputToRow(input)

    const { data: inserted, error } = await session.supabase
      .from('insurance_policies')
      // owner_user_id はリクエストボディの値を一切使わず、サーバーが確定したuserIdを常に使う。
      .insert({ ...row, owner_user_id: session.userId })
      .select('id')
      .single()

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')

    const riderRows = riderInputsToRows(input, inserted.id, session.userId)
    if (riderRows.length > 0) {
      const { error: riderError } = await session.supabase.from('policy_riders').insert(riderRows)
      if (riderError) throw new HttpError(500, 'サーバーエラーが発生しました。')
    }

    const { data: full, error: fetchError } = await session.supabase
      .from('insurance_policies')
      .select(POLICY_SELECT)
      .eq('id', inserted.id)
      .single()
    if (fetchError) throw new HttpError(500, 'サーバーエラーが発生しました。')

    await writeAuditLog(session.supabase, session.userId, 'create', 'insurance_policy', inserted.id)
    sendJson(res, 201, { policy: policyRowToApi(full as unknown as PolicyRow) })
    return
  }

  methodNotAllowed(res, ['GET', 'POST'])
}

export default withErrorHandling(handler)
