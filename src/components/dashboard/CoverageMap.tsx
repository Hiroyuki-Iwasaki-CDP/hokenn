import { CATEGORY_ORDER, getCategory, tint } from '../../lib/categories'
import type { CategoryId } from '../../types/insurance'

function buildConicGradient(colors: string[], gapDeg = 3): string {
  if (colors.length === 0) return 'transparent'
  const n = colors.length
  const each = 360 / n
  const stops: string[] = []
  let angle = 0
  for (let i = 0; i < n; i += 1) {
    const start = angle + gapDeg / 2
    const end = angle + each - gapDeg / 2
    stops.push(`${colors[i]} ${start}deg ${end}deg`)
    stops.push(`transparent ${end}deg ${angle + each}deg`)
    angle += each
  }
  return `conic-gradient(${stops.join(', ')})`
}

export default function CoverageMap({ registeredCategories }: { registeredCategories: Set<CategoryId> }) {
  const registeredOrdered = CATEGORY_ORDER.filter((id) => registeredCategories.has(id))
  const colors = registeredOrdered.map((id) => getCategory(id).color)
  const gradient = buildConicGradient(colors)
  const count = registeredOrdered.length

  return (
    <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h3 className="text-sm font-bold text-ink">保障の全体像</h3>
      <p className="mt-0.5 mb-5 text-xs text-ink-muted">どの分野に備えがあり、どの分野が未登録かをまとめて確認できます。</p>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="mx-auto flex shrink-0 items-center justify-center sm:mx-0">
          <div
            className="relative flex h-40 w-40 items-center justify-center rounded-full"
            style={{ background: count > 0 ? gradient : undefined, backgroundColor: 'var(--color-line)' }}
          >
            <div className="absolute inset-[15%] flex flex-col items-center justify-center rounded-full bg-white text-center">
              <span className="text-4xl font-bold text-ink tabular-nums">{count}</span>
              <span className="mt-0.5 max-w-[6rem] text-[11px] leading-tight text-ink-muted">
                分野に
                <br />
                備えがあります
              </span>
            </div>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          {CATEGORY_ORDER.map((id) => {
            const meta = getCategory(id)
            const Icon = meta.icon
            const isRegistered = registeredCategories.has(id)
            return (
              <div
                key={id}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${isRegistered ? '' : 'opacity-70'}`}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: isRegistered ? tint(meta.color, '20') : 'var(--color-plane)',
                    color: isRegistered ? meta.color : 'var(--color-ink-muted)',
                  }}
                >
                  <Icon size={16} strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{meta.label}</span>
                  <span className="flex items-center gap-1 text-[11px] text-ink-muted">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: isRegistered ? meta.color : 'var(--color-ink-muted)' }}
                    />
                    {isRegistered ? '備えあり' : '未登録'}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-5 rounded-xl bg-plane px-4 py-3 text-xs leading-relaxed text-ink-secondary">
        「未登録」は保険が不足しているという意味ではありません。他の保険や勤務先の保障で備えている場合もあります。お手元の契約内容とあわせてご確認ください。
      </p>
    </div>
  )
}
