import type { VercelRequest, VercelResponse } from '@vercel/node'
import { methodNotAllowed, withErrorHandling } from '../../../_lib/http.js'
import { requireSessionUser } from '../../../_lib/session.js'
import {
  buildLineAuthorizeUrl,
  createLineOAuthValues,
  getLineConfig,
  setLineOAuthCookies,
} from '../../../_lib/lineOAuth.js'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET'])
  const flow = req.query.flow === 'login' ? 'login' : 'link'
  const next = req.query.next === 'consultation'
    ? 'consultation'
    : flow === 'link' && req.query.next === 'advisor'
      ? 'advisor'
      : 'home'
  if (flow === 'link') await requireSessionUser(req, res)

  const config = getLineConfig()
  const values = createLineOAuthValues()
  setLineOAuthCookies(res, values, flow, next)
  res.setHeader('Cache-Control', 'no-store')
  res.redirect(302, buildLineAuthorizeUrl(config, values))
}

export default withErrorHandling(handler)
