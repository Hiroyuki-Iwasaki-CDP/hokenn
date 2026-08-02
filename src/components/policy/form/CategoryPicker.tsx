import type { CategoryId } from '../../../types/insurance'
import { CATEGORY_ORDER, getCategory, tint } from '../../../lib/categories'

export default function CategoryPicker({
  value,
  onChange,
}: {
  value: CategoryId
  onChange: (id: CategoryId) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {CATEGORY_ORDER.map((id) => {
        const meta = getCategory(id)
        const Icon = meta.icon
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
              selected ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-200' : 'border-line bg-white hover:bg-plane/60'
            }`}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: tint(meta.color, '20'), color: meta.color }}
            >
              <Icon size={19} strokeWidth={2.25} />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">{meta.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{meta.description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
