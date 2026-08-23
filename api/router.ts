import type { VercelRequest, VercelResponse } from '@vercel/node'
import accountDelete from './_handlers/account/delete.js'
import advisor from './_handlers/advisor/index.js'
import advisorClients from './_handlers/advisor/clients/index.js'
import advisorClientPolicies from './_handlers/advisor/clients/[id]/policies.js'
import advisorConsultations from './_handlers/advisor/consultations.js'
import lineCallback from './_handlers/auth/line/callback.js'
import lineStart from './_handlers/auth/line/start.js'
import lineStatus from './_handlers/auth/line/status.js'
import logout from './_handlers/auth/logout.js'
import requestCode from './_handlers/auth/request-code.js'
import session from './_handlers/auth/session.js'
import verifyCode from './_handlers/auth/verify-code.js'
import myAdvisor from './_handlers/my-advisor.js'
import policy from './_handlers/policies/[id].js'
import policies from './_handlers/policies/index.js'
import policySharing from './_handlers/policy-sharing.js'
import profile from './_handlers/profile.js'
import productsCatalog from './_handlers/products.js'
import exchangeRate from './_handlers/exchange-rate.js'
import exchangeRateCron from './_handlers/cron/exchange-rate.js'
import { sendJson } from './_lib/http.js'

type ApiHandler = (req: VercelRequest, res: VercelResponse) => unknown

const exactRoutes: Record<string, ApiHandler> = {
  '/api/account/delete': accountDelete,
  '/api/advisor': advisor,
  '/api/advisor/clients': advisorClients,
  '/api/advisor/consultations': advisorConsultations,
  '/api/auth/line/callback': lineCallback,
  '/api/auth/line/start': lineStart,
  '/api/auth/line/status': lineStatus,
  '/api/auth/logout': logout,
  '/api/auth/request-code': requestCode,
  '/api/auth/session': session,
  '/api/auth/verify-code': verifyCode,
  '/api/my-advisor': myAdvisor,
  '/api/policies': policies,
  '/api/policy-sharing': policySharing,
  '/api/profile': profile,
  '/api/products': productsCatalog,
  '/api/exchange-rate': exchangeRate,
  '/api/cron/exchange-rate': exchangeRateCron,
}

/**
 * Vercel HobbyのFunction数上限に抵触しないよう、公開APIを1つのFunctionへ集約する。
 * 各ハンドラーの認証・認可・Origin検証は従来どおり個別ハンドラー側で強制する。
 */
export default async function apiRouter(req: VercelRequest, res: VercelResponse) {
  const routeParam = req.query.route
  const route = Array.isArray(routeParam) ? routeParam.join('/') : routeParam
  const pathname = route
    ? `/api/${route}`.replace(/\/$/, '')
    : new URL(req.url ?? '/', 'http://localhost').pathname.replace(/\/$/, '') || '/'
  const exactHandler = exactRoutes[pathname]
  if (exactHandler) {
    await exactHandler(req, res)
    return
  }

  const policyMatch = pathname.match(/^\/api\/policies\/([^/]+)$/)
  if (policyMatch) {
    req.query.id = policyMatch[1]
    await policy(req, res)
    return
  }

  const advisorPoliciesMatch = pathname.match(/^\/api\/advisor\/clients\/([^/]+)\/policies$/)
  if (advisorPoliciesMatch) {
    req.query.id = advisorPoliciesMatch[1]
    await advisorClientPolicies(req, res)
    return
  }

  sendJson(res, 404, { error: 'APIが見つかりません。' })
}
