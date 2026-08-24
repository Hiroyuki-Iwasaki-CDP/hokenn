import { requireEnv } from './env.js'

export async function pushLineText(lineUserId: string | null | undefined, text: string): Promise<boolean> {
  if (!lineUserId || !/^U[0-9a-f]{32}$/.test(lineUserId)) return false

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      signal: AbortSignal.timeout(4_000),
      headers: {
        Authorization: `Bearer ${requireEnv('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: lineUserId, messages: [{ type: 'text', text }] }),
    })
    if (!response.ok) console.warn('[line-notification] push failed', { status: response.status })
    return response.ok
  } catch {
    console.warn('[line-notification] push failed')
    return false
  }
}
