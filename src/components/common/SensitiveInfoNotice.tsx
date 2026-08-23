import { ShieldAlert } from 'lucide-react'

export default function SensitiveInfoNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-900">
      <ShieldAlert size={16} className="mt-0.5 shrink-0" />
      <p>
        安全のため、保険証券画像、病歴、口座情報、クレジットカード情報は登録しないでください。入力は契約内容の確認に必要な範囲に限定してください。
      </p>
    </div>
  )
}
