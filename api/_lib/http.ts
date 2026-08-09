import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ZodError } from 'zod'
import { requireEnv } from './env'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function sendJson(res: VercelResponse, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(body))
}

export function sendError(res: VercelResponse, status: number, message: string) {
  sendJson(res, status, { error: message })
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '))
  sendError(res, 405, 'このメソッドは許可されていません。')
}

/**
 * CSRF対策: Cookie(SameSite=Lax)に加えて、状態変更リクエストのOriginヘッダーが
 * 自ドメインと一致することをサーバー側でも確認する。一致しない場合は拒否する。
 */
export function assertTrustedOrigin(req: VercelRequest) {
  const allowedOrigin = requireEnv('ALLOWED_ORIGIN')
  const origin = req.headers.origin
  if (!origin || origin !== allowedOrigin) {
    throw new HttpError(403, 'リクエスト元を確認できませんでした。')
  }
}

/**
 * 全APIハンドラの共通ラッパー。
 * - 未処理の例外を捕捉し、内部情報(スタックトレース・SQLエラー等)をレスポンスに漏らさない。
 * - サーバーログには最小限の情報のみ出す(個人情報・トークン・認証コードは出力しない)。
 */
export function withErrorHandling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>,
): (req: VercelRequest, res: VercelResponse) => Promise<void> {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (err) {
      if (err instanceof HttpError) {
        sendError(res, err.status, err.message)
        return
      }
      if (err instanceof ZodError) {
        const message = err.issues[0]?.message ?? '入力内容を確認してください。'
        sendError(res, 400, message)
        return
      }
      // eslint-disable-next-line no-console
      console.error('[api] unhandled error', { path: req.url, method: req.method })
      sendError(res, 500, 'サーバーエラーが発生しました。しばらくしてから再度お試しください。')
    }
  }
}

export async function readJsonBody<T>(req: VercelRequest): Promise<T> {
  if (req.body && typeof req.body === 'object') return req.body as T
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T
    } catch {
      throw new HttpError(400, 'リクエスト内容を解釈できませんでした。')
    }
  }
  throw new HttpError(400, 'リクエスト内容を解釈できませんでした。')
}

export function clientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim()
  }
  return req.socket?.remoteAddress ?? 'unknown'
}
