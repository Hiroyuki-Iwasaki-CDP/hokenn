import type { CategoryId } from '../../types/insurance'
import { getCategory, tint } from '../../lib/categories'

export default function CategoryIcon({
  category,
  size = 'md',
}: {
  category: CategoryId
  size?: 'sm' | 'md' | 'lg'
}) {
  const meta = getCategory(category)
  const Icon = meta.icon
  const dims = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10'
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 26 : 20

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${dims}`}
      style={{ backgroundColor: tint(meta.color, '20'), color: meta.color }}
      aria-hidden="true"
    >
      <Icon size={iconSize} strokeWidth={2} />
    </span>
  )
}
