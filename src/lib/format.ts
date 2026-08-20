export function formatYen(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '—'
  return `${Math.round(amount).toLocaleString('ja-JP')}円`
}

export function formatYenPerDay(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '—'
  return `${Math.round(amount).toLocaleString('ja-JP')}円/日`
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
