import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, methodNotAllowed, sendJson, withErrorHandling } from '../../_lib/http.js'
import { requireEnv } from '../../_lib/env.js'
import { createSupabaseAdminClient } from '../../_lib/supabaseServer.js'

interface FrankfurterRate {
  date?: string
  base?: string
  quote?: string
  rate?: number
}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET'])
    return
  }

  const expected = `Bearer ${requireEnv('CRON_SECRET')}`
  if (req.headers.authorization !== expected) throw new HttpError(401, '認証できませんでした。')

  const response = await fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes=JPY', {
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new HttpError(503, '為替レート提供元に接続できませんでした。')

  const payload = (await response.json()) as FrankfurterRate[]
  const item = payload.find((value) => value.base === 'USD' && value.quote === 'JPY')
  if (!item?.rate || !Number.isFinite(item.rate) || item.rate <= 0 || !item.date) {
    throw new HttpError(503, '為替レートの応答を確認できませんでした。')
  }

  const { error } = await createSupabaseAdminClient().from('exchange_rates').upsert({
    pair: 'USD_JPY',
    rate: item.rate,
    source: 'Frankfurter',
    source_date: item.date,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new HttpError(500, '為替レートを保存できませんでした。')

  sendJson(res, 200, { ok: true, pair: 'USD_JPY', rate: item.rate, sourceDate: item.date })
}

export default withErrorHandling(handler)
