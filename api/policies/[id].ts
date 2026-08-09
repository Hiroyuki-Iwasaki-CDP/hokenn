import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertTrustedOrigin, HttpError, methodNotAllowed, readJsonBody, sendJson, withErrorHandling } from '../_lib/http'
import { requireSessionUser } from '../_lib/session'
import { policyInputSchema } from '../_lib/validation'
import { policyInputToRow, policyRowToApi, type PolicyRow } from '../_lib/mappers'
import { writeAuditLog } from '../_lib/audit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSessionUser(req, res)
  const id = req.query.id
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    throw new HttpError(404, '指定された保険が見つかりませんでした。')
  }

  if (req.method === 'GET') {
    // id だけでなく owner_user_id = session.userId も条件に含めることで、
    // 他の顧客の契約IDを指定しても取得できないようにする(RLSによる二重防御も有効)。
    const { data, error } = await session.supabase
      .from('insurance_policies')
      .select('*')
      .eq('id', id)
      .eq('owner_user_id', session.userId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')
    if (!data) throw new HttpError(404, '指定された保険が見つかりませんでした。')
    sendJson(res, 200, { policy: policyRowToApi(data as PolicyRow) })
    return
  }

  if (req.method === 'PUT') {
    assertTrustedOrigin(req)
    const input = policyInputSchema.parse(await readJsonBody(req))
    const row = policyInputToRow(input)

    const { data, error } = await session.supabase
      .from('insurance_policies')
      .update(row)
      .eq('id', id)
      .eq('owner_user_id', session.userId)
      .is('deleted_at', null)
      .select('*')
      .maybeSingle()

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')
    if (!data) throw new HttpError(404, '指定された保険が見つかりませんでした。')

    await writeAuditLog(session.supabase, session.userId, 'update', 'insurance_policy', id)
    sendJson(res, 200, { policy: policyRowToApi(data as PolicyRow) })
    return
  }

  if (req.method === 'DELETE') {
    assertTrustedOrigin(req)
    const { data, error } = await session.supabase
      .from('insurance_policies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_user_id', session.userId)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')
    if (!data) throw new HttpError(404, '指定された保険が見つかりませんでした。')

    await writeAuditLog(session.supabase, session.userId, 'delete', 'insurance_policy', id)
    sendJson(res, 200, { ok: true })
    return
  }

  methodNotAllowed(res, ['GET', 'PUT', 'DELETE'])
}

export default withErrorHandling(handler)
