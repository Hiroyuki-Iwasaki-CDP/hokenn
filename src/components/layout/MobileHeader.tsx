import { ShieldCheck } from 'lucide-react'

export default function MobileHeader() {
  return (
    <header className="flex items-center gap-2 border-b border-line bg-white px-4 py-3 md:hidden">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-700 text-white">
        <ShieldCheck size={16} strokeWidth={2.25} />
      </span>
      <span className="text-sm font-bold text-ink">わが家の保険</span>
    </header>
  )
}
