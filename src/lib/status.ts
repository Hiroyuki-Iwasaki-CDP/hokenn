import type { PolicyStatus } from '../types/insurance'

export const STATUS_META: Record<PolicyStatus, { label: string; tone: 'good' | 'muted' | 'warning' }> = {
  active: { label: '有効', tone: 'good' },
  lapsed: { label: '失効', tone: 'warning' },
  cancelled: { label: '解約', tone: 'muted' },
  matured: { label: '満期', tone: 'muted' },
}
