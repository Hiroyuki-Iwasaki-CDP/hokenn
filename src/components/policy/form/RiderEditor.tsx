import { Plus, Trash2 } from 'lucide-react'
import type { Rider } from '../../../types/insurance'
import { newRider } from '../../../lib/policyDraft'

export default function RiderEditor({ riders, onChange }: { riders: Rider[]; onChange: (riders: Rider[]) => void }) {
  const update = (id: string, patch: Partial<Rider>) => {
    onChange(riders.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  const remove = (id: string) => onChange(riders.filter((r) => r.id !== id))
  const add = () => onChange([...riders, newRider()])

  return (
    <div className="space-y-3">
      {riders.length === 0 && (
        <p className="rounded-xl bg-plane px-3.5 py-3 text-xs text-ink-muted">
          特約がある場合は追加してください。特約がなければ、そのまま次へ進んで構いません。
        </p>
      )}
      {riders.map((rider, index) => (
        <div key={rider.id} className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-ink-muted">特約 {index + 1}</p>
            <button
              type="button"
              onClick={() => remove(rider.id)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-muted hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={13} />
              削除
            </button>
          </div>
          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-secondary">特約名</span>
              <input
                type="text"
                value={rider.name}
                onChange={(e) => update(rider.id, { name: e.target.value })}
                placeholder="例: 先進医療特約"
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-brand-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink-secondary">保障額(任意・円)</span>
              <input
                type="number"
                min={0}
                value={rider.amount ?? ''}
                onChange={(e) => update(rider.id, { amount: e.target.value === '' ? undefined : Number(e.target.value) })}
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink tabular-nums focus:border-brand-400 focus:outline-none"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={rider.active}
                onChange={(e) => update(rider.id, { active: e.target.checked })}
                className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-300"
              />
              <span className="text-sm font-medium text-ink">この特約は付帯している</span>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-ink-secondary">メモ(任意)</span>
              <input
                type="text"
                value={rider.note ?? ''}
                onChange={(e) => update(rider.id, { note: e.target.value })}
                placeholder="補足があれば入力してください"
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-brand-400 focus:outline-none"
              />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50/60"
      >
        <Plus size={16} />
        特約を追加
      </button>
    </div>
  )
}
