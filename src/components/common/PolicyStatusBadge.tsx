import { CheckCircle2, PauseCircle, XCircle, FlagTriangleRight } from 'lucide-react'
import type { PolicyStatus } from '../../types/insurance'
import { STATUS_META } from '../../lib/status'
import Badge from './Badge'

const ICONS: Record<PolicyStatus, typeof CheckCircle2> = {
  active: CheckCircle2,
  lapsed: FlagTriangleRight,
  cancelled: XCircle,
  matured: PauseCircle,
}

export default function PolicyStatusBadge({ status }: { status: PolicyStatus }) {
  const meta = STATUS_META[status]
  const Icon = ICONS[status]
  return (
    <Badge tone={meta.tone} icon={<Icon size={13} />}>
      {meta.label}
    </Badge>
  )
}
