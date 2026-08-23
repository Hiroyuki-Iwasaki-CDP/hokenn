import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, methodNotAllowed, sendJson, withErrorHandling } from '../_lib/http.js'
import { createSupabaseAdminClient } from '../_lib/supabaseServer.js'

const PAIR = 'USD_JPY'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET'])
    return
  }

  const { data, error } = await createSupabaseAdminClient()
    .from('exchange_rates')
    .select('pair, rate, updated_at, source, source_date')
    .eq('pair', PAIR)
    .single()

  if (error || !data) throw new HttpError(503, '為替レートを取得できませんでした。')
  sendJson(res, 200, {
    pair: data.pair,
    rate: Number(data.rate),
    updatedAt: data.updated_at,
    source: data.source,
    sourceDate: data.source_date,
  })
}

export default withErrorHandling(handler)
