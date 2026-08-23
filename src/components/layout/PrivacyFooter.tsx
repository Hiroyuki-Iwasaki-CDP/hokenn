import { Info, HardDrive } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PrivacyFooter() {
  return (
    <footer className="mt-10 space-y-2 border-t border-line px-1 py-6 text-xs text-ink-muted">
      <p className="flex items-start gap-1.5">
        <HardDrive size={14} className="mt-0.5 shrink-0" />
        入力したデータはご本人と、ご本人が明示的に共有を許可した担当者だけが確認できます。
      </p>
      <p className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
        <Link to="/privacy" className="font-semibold text-brand-700 hover:underline">
          プライバシーポリシー
        </Link>
        <Link to="/terms" className="font-semibold text-brand-700 hover:underline">
          利用規約
        </Link>
      </p>
      <p className="flex items-start gap-1.5">
        <Info size={14} className="mt-0.5 shrink-0" />
        このアプリは保険・法律・税務上の助言を行うものではありません。ご契約内容の確認は保険証券や保険会社にお問い合わせください。
      </p>
    </footer>
  )
}
