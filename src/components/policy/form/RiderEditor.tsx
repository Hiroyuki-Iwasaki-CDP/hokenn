import { Plus, Trash2 } from 'lucide-react'
import type { RiderInput } from '../../../types/insurance'
import { newRider } from '../../../lib/policyDraft'
import { CheckboxField, NumberField, TextAreaField, TextField } from './fields'

export default function RiderEditor({
  riders,
  onChange,
}: {
  riders: RiderInput[]
  onChange: (riders: RiderInput[]) => void
}) {
  const update = (i: number, patch: Partial<RiderInput>) => {
    onChange(riders.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  const remove = (i: number) => onChange(riders.filter((_, idx) => idx !== i))
  const add = () => onChange([...riders, newRider()])

  return (
    <div className="space-y-4">
      {riders.length === 0 && <p className="text-sm text-ink-muted">特約は登録されていません。</p>}

      {riders.map((rider, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-line p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <TextField
                label="特約名"
                value={rider.name}
                onChange={(v) => update(i, { name: v })}
                placeholder="例: 先進医療特約"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="mt-7 shrink-0 rounded-lg p-2 text-ink-muted hover:bg-red-50 hover:text-red-600"
              aria-label="この特約を削除"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              label="給付額"
              unit="円"
              value={rider.amount}
              onChange={(v) => update(i, { amount: v })}
              placeholder="0"
            />
            <CheckboxField label="現在有効" checked={rider.active} onChange={(v) => update(i, { active: v })} />
          </div>
          <TextAreaField
            label="メモ"
            value={rider.note}
            onChange={(v) => update(i, { note: v })}
            placeholder="給付条件など"
            rows={2}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 rounded-xl border border-dashed border-line px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50/60"
      >
        <Plus size={15} />
        特約を追加
      </button>
    </div>
  )
}
