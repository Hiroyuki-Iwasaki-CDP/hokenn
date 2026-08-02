import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'
import MobileNav from './MobileNav'
import PrivacyFooter from './PrivacyFooter'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-plane">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 px-4 pt-6 pb-24 sm:px-6 md:px-10 md:pt-8 md:pb-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
            <PrivacyFooter />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
