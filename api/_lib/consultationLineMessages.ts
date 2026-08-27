import { requireEnv } from './env.js'
import type { LineNotificationEvent } from './lineNotificationDelivery.js'

function formatLineDate(value: string): string {
  return new Date(value).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function buildAdvisorLineNotification(event: Extract<LineNotificationEvent, 'appointment_requested' | 'appointment_rescheduled' | 'customer_cancelled'>, customerName: string): string {
  const url = new URL('/advisor', requireEnv('ALLOWED_ORIGIN')).toString()
  if (event === 'appointment_requested') return `${customerName}さんから相談日時の候補が届きました。\n\n担当者画面で内容を確認してください。\n${url}`
  if (event === 'appointment_rescheduled') return `${customerName}さんが相談日時の候補を変更しました。\n${url}`
  return `${customerName}さんが相談日時の申込みを取り消しました。\n${url}`
}

export function buildCustomerLineNotification(event: Extract<LineNotificationEvent, 'advisor_confirmed' | 'advisor_cancelled'>, confirmedStartAt: string | null): string {
  const url = new URL('/line?next=consultation', requireEnv('ALLOWED_ORIGIN')).toString()
  if (event === 'advisor_confirmed') {
    if (!confirmedStartAt) throw new Error('confirmed appointment requires confirmedStartAt')
    return `相談日時が確定しました。\n\n${formatLineDate(confirmedStartAt)}\n\nアプリで確認できます。\n${url}`
  }
  return `担当者が相談日時の申込みを取り消しました。必要に応じて担当者へご連絡ください。\n${url}`
}
