import type { ChangeEvent, ReactNode } from 'react'

export function FieldLabel({
  label,
  required,
  hint,
}: {
  label: string
  required?: boolean
  hint?: string
}) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
      {label}
      {required ? (
        <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">必須</span>
      ) : (
        <span className="rounded bg-plane px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">任意</span>
      )}
      {hint && <span className="font-normal text-ink-muted">({hint})</span>}
    </span>
  )
}

const inputClass =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100'

export function TextField({
  label,
  required,
  hint,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  required?: boolean
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} hint={hint} />
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  )
}

export function NumberField({
  label,
  required,
  unit,
  value,
  onChange,
  placeholder,
  min = 0,
}: {
  label: string
  required?: boolean
  unit?: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  placeholder?: string
  min?: number
}) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} hint={unit} />
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value
            onChange(raw === '' ? undefined : Number(raw))
          }}
          className={`${inputClass} pr-12 tabular-nums`}
        />
        {unit && (
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-medium text-ink-muted">
            {unit}
          </span>
        )}
      </div>
    </label>
  )
}

export function DateField({
  label,
  required,
  value,
  onChange,
  hint,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} hint={hint} />
      <input
        type="date"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        className={`${inputClass} tabular-nums`}
      />
    </label>
  )
}

export function SelectField({
  label,
  required,
  value,
  onChange,
  options,
  hint,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  hint?: string
}) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} hint={hint} />
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TextAreaField({
  label,
  required,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-y`}
      />
    </label>
  )
}

export function CheckboxField({
  label,
  checked,
  onChange,
  description,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-3.5 py-3 hover:bg-plane/60">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-300"
      />
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-muted">{description}</span>}
      </span>
    </label>
  )
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
}
