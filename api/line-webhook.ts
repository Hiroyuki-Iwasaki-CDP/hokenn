import { createHmac, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSupabaseAdminClient } from './_lib/supabaseServer.js'
import { requireEnv } from './_lib/env.js'

export const config = { api: { bodyParser: false } }

const CONSULTATION_KEYWORD = '担当者に相談したいです'
const MAX_BODY_BYTES = 1024 * 1024

interface LineWebhookEvent {
  type?: string
  replyToken?: string
  source?: { type?: string; userId?: string }
  message?: { type?: string; text?: string }
}

interface LineWebhookBody {
  events?: LineWebhookEvent[]
}

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new Error('Webhook body is too large')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

function hasValidSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature) return false
  const expected = createHmac('sha256', requireEnv('LINE_MESSAGING_CHANNEL_SECRET')).update(rawBody).digest()
  let received: Buffer
  try {
    received = Buffer.from(signature, 'base64')
  } catch {
    return false
  }
  return received.length === expected.length && timingSafeEqual(received, expected)
}

async function reply(replyToken: string, text: string): Promise<void> {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireEnv('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  })
  if (!response.ok) throw new Error('LINE reply API failed')
}

async function consultationReply(event: LineWebhookEvent): Promise<void> {
  const userId = event.source?.type === 'user' ? event.source.userId : undefined
  if (!event.replyToken || !userId || !/^U[0-9a-f]{32}$/.test(userId)) return

  const admin = createSupabaseAdminClient()
  const { data: customer, error } = await admin
    .from('users')
    .select('id, advisor_id')
    .eq('line_user_id', userId)
    .eq('role', 'customer')
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw new Error('LINE-linked customer lookup failed')

  if (!customer) {
    await reply(
      event.replyToken,
      'ご相談を受け付けました。担当者が順次このトークでご連絡します。\n\nご本人との対応を確認できるよう、リッチメニューの「保険を確認」から初回ログインとLINE連携をお願いします。安全のため、保険証券の画像・病歴・口座情報などは送信しないでください。',
    )
    return
  }

  await admin.from('audit_logs').insert({
    owner_user_id: customer.id,
    action: 'line_consultation_requested',
    resource_type: customer.advisor_id ? 'advisor' : 'support',
    resource_id: customer.advisor_id ?? null,
  })

  if (customer.advisor_id) {
    await admin.from('line_consultation_requests').upsert(
      {
        customer_user_id: customer.id,
        advisor_user_id: customer.advisor_id,
        status: 'open',
        requested_at: new Date().toISOString(),
        resolved_at: null,
      },
      { onConflict: 'customer_user_id' },
    )
  }

  await reply(
    event.replyToken,
    customer.advisor_id
      ? '担当者へのご相談を受け付けました。担当者が順次このトークでご連絡します。\n\n安全のため、保険証券の画像・病歴・口座情報などは送信しないでください。'
      : 'ご相談を受け付けました。運営窓口が順次このトークでご連絡します。\n\n安全のため、保険証券の画像・病歴・口座情報などは送信しないでください。',
  )
}

export default async function lineWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).end()
    return
  }

  try {
    const rawBody = await readRawBody(req)
    const header = req.headers['x-line-signature']
    const signature = Array.isArray(header) ? header[0] : header
    if (!hasValidSignature(rawBody, signature)) {
      res.status(401).end()
      return
    }

    const body = JSON.parse(rawBody.toString('utf8')) as LineWebhookBody
    const consultations = (body.events ?? []).filter(
      (event) =>
        event.type === 'message' &&
        event.message?.type === 'text' &&
        event.message.text?.trim() === CONSULTATION_KEYWORD,
    )
    await Promise.allSettled(consultations.map(consultationReply))
    res.status(200).end()
  } catch {
    // 個人情報・メッセージ本文・トークンはログへ出さない。
    console.error('[line-webhook] processing failed')
    res.status(500).end()
  }
}
