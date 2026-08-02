import type { CategoryId } from '../../types/insurance'
import { getCategory, tint } from '../../lib/categories'

export default function CategoryTag({ category, short = false }: { category: CategoryId; short?: boolean }) {
  const meta = getCategory(category)
  const Icon = meta.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: tint(meta.color, '18'), color: meta.color }}
    >
      <Icon size={14} strokeWidth={2.25} />
      {short ? meta.shortLabel : meta.label}
    </span>
  )
}
