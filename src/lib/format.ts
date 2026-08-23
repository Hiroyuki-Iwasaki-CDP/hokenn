export function formatYen(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '—'
  return `${Math.round(amount).toLocaleString('ja-JP')}円`
}

export function formatYenPerDay(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '—'
  return `${Math.round(amount).toLocaleString('ja-JP')}円/日`
}

export function formatUsd(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)
}

export function formatMoney(amount: number | undefined | null, currency: 'JPY' | 'USD', perDay = false): string {
  const formatted = currency === 'USD' ? formatUsd(amount) : formatYen(amount)
  return formatted === '—' || !perDay ? formatted : `${formatted}/日`
}

export function convertToYen(amount: number, currency: 'JPY' | 'USD', usdJpy: number | null): number | null {
  if (currency === 'JPY') return amount
  return usdJpy === null ? null : amount * usdJpy
}

export function formatMoneyWithYen(
  amount: number | undefined | null,
  currency: 'JPY' | 'USD',
  usdJpy: number | null,
  perDay = false,
): string {
  const original = formatMoney(amount, currency, perDay)
  if (currency === 'JPY' || amount === undefined || amount === null || usdJpy === null) return original
  const converted = formatYen(amount * usdJpy)
  return `${original}（約${converted}${perDay ? '/日' : ''}）`
}

export function formatRateDate(iso: string | null): string {
  if (!iso) return '取得日不明'
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${year}/${month}/${day}`
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function maskPolicyNumber(policyNumber: string | undefined | null): string {
  if (!policyNumber) return '—'
  const trimmed = policyNumber.trim()
  if (trimmed.length <= 4) return '•'.repeat(trimmed.length)
  const tail = trimmed.slice(-4)
  return `${'•'.repeat(Math.max(trimmed.length - 4, 4))}${tail}`
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`
}

export function daysUntil(iso: string | undefined | null, from: Date = new Date()): number | null {
  if (!iso) return null
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return null
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}
