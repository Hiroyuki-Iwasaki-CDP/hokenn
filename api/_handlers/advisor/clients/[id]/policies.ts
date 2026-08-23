import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, methodNotAllowed, sendJson, withErrorHandling } from '../../../../_lib/http.js'
import { requireAdvisorSession } from '../../../../_lib/session.js'
import { policyRowToApi, type PolicyRow } from '../../../../_lib/mappers.js'
import { writeAuditLog } from '../../../../_lib/audit.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const POLICY_SELECT = '*, riders:policy_riders(*)'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])

  const session = await requireAdvisorSession(req, res)
  const clientId = req.query.id
  if (typeof clientId !== 'string' || !UUID_RE.test(clientId)) {
    throw new HttpError(404, '指定された顧客が見つかりませんでした。')
  }

  // 自分の担当顧客であることを、API条件とusersのRLSで二重に確認する。
  const { data: client, error: clientError } = await session.supabase
    .from('users')
    .select('id, email, display_name')
    .eq('id', clientId)
    .eq('advisor_id', session.userId)
    .is('deleted_at', null)
    .maybeSingle()
  if (clientError) throw new HttpError(500, 'サーバーエラーが発生しました。')
  if (!client) throw new HttpError(404, '指定された顧客が見つかりませんでした。')

  // 同意行も担当FP本人にしか見えない。解除済み・担当変更済みは許可しない。
  const { data: consent, error: consentError } = await session.supabase
    .from('policy_sharing_consents')
    .select('granted_at')
    .eq('customer_user_id', clientId)
    .eq('advisor_user_id', session.userId)
    .eq('scope', 'full')
    .is('revoked_at', null)
    .maybeSingle()
  if (consentError) throw new HttpError(500, 'サーバーエラーが発生しました。')
  if (!consent) {
    throw new HttpError(403, 'この契約者から保険情報の共有許可を受けていません。')
  }

  // SELECTだけが共有対象。更新・削除ポリシーは所有者本人のままなので担当FPは変更できない。
  const { data, error } = await session.supabase
    .from('insurance_policies')
    .select(POLICY_SELECT)
    .eq('owner_user_id', clientId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')

  await writeAuditLog(session.supabase, session.userId, 'view_shared_policies', 'customer', clientId)
  sendJson(res, 200, {
    client: {
      id: client.id,
      email: client.email,
      displayName: client.display_name,
    },
    sharingGrantedAt: consent.granted_at,
    policies: (data as unknown as PolicyRow[]).map(policyRowToApi),
  })
}

export default withErrorHandling(handler)
