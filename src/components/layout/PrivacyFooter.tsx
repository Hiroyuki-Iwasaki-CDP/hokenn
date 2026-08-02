import { Info, HardDrive } from 'lucide-react'

export default function PrivacyFooter() {
  return (
    <footer className="mt-10 space-y-2 border-t border-line px-1 py-6 text-xs text-ink-muted">
      <p className="flex items-start gap-1.5">
        <HardDrive size={14} className="mt-0.5 shrink-0" />
        入力したデータはお使いのブラウザ内(localStorage)にのみ保存され、外部には送信されません。
      </p>
      <p className="flex items-start gap-1.5">
        <Info size={14} className="mt-0.5 shrink-0" />
        このアプリは保険・法律・税務上の助言を行うものではありません。ご契約内容の確認は保険証券や保険会社にお問い合わせください。
      </p>
    </footer>
  )
}
