import { Link, Outlet } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import DemoSidebar from './DemoSidebar'
import MobileHeader from './MobileHeader'
import BetaNotice from '../common/BetaNotice'

export default function DemoLayout() {
  return (
    <div className="flex min-h-screen bg-plane">
      <DemoSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 px-4 pt-6 pb-24 sm:px-6 md:px-10 md:pt-8 md:pb-10">
          <div className="mx-auto max-w-6xl space-y-4">
            <BetaNotice />
            <Outlet />
          </div>
        </main>
      </div>

      <Link
        to="/login"
        className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white shadow-lg md:hidden"
      >
        <LogIn size={16} strokeWidth={2.5} />
        ログインして使ってみる
      </Link>
    </div>
  )
}
