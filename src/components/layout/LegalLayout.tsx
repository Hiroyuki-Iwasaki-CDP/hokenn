import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { SERVICE_NAME } from '../../config/service'

export default function LegalLayout() {
  return (
    <div className="min-h-screen bg-plane">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
              <ShieldCheck size={17} strokeWidth={2.25} />
            </span>
            <span className="text-sm font-bold">{SERVICE_NAME}</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink">
            <ArrowLeft size={14} />
            アプリへ戻る
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>
    </div>
  )
}
