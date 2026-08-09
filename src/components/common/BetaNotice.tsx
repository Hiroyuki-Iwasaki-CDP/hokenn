import { AlertTriangle } from 'lucide-react'

export default function BetaNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <p>
        本サービスは現在テスト提供中です。保険証券画像、病歴、口座情報、クレジットカード情報などの機密情報は登録しないでください。
      </p>
    </div>
  )
}
