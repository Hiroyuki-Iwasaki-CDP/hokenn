import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, methodNotAllowed, sendJson, withErrorHandling } from '../_lib/http.js'
import { requireSessionUser } from '../_lib/session.js'
import { advisorRowToApi, type AdvisorRow } from '../_lib/mappers.js'

const ADVISOR_COLUMNS = 'advisor_name, agency_name, title, phone, email, official_line_url, contact_hours, is_accepting_inquiries'

/**
 * 顧客のダッシュボードに表示する「担当者」を解決するための読み取り専用API。
 * FPアカウントに招待済みの顧客は、そのFP自身のプロフィール(advisor_profiles.owner_user_id = advisor_id)を
 * 表示する。招待されていない顧客(β初期の手動入力ユーザー等)は、従来どおり自分自身の
 * advisor_profiles行(手動入力した連絡先)にフォールバックする。
 * 編集は /api/advisor(常に「自分自身の行」を編集する)を使う。
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
  const session = await requireSessionUser(req, res)

  const { data: userRow, error: userError } = await session.supabase
    .from('users')
    .select('advisor_id')
    .eq('id', session.userId)
    .maybeSingle()
  if (userError) throw new HttpError(500, 'サーバーエラーが発生しました。')

  const targetOwnerId = userRow?.advisor_id ?? session.userId

  const { data, error } = await session.supabase
    .from('advisor_profiles')
    .select(ADVISOR_COLUMNS)
    .eq('owner_user_id', targetOwnerId)
    .maybeSingle()

  if (error) throw new HttpError(500, 'サーバーエラーが発生しました。')

  sendJson(res, 200, {
    advisor: advisorRowToApi(data as AdvisorRow | null),
    managedByAdvisorAccount: !!userRow?.advisor_id,
  })
}

export default withErrorHandling(handler)
