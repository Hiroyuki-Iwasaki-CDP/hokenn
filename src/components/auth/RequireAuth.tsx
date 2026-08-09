import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { ShieldCheck } from 'lucide-react'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-plane">
      <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-brand-700 text-white">
        <ShieldCheck size={20} strokeWidth={2.25} />
      </span>
    </div>
  )
}

// 未ログインなら /login へ。オンボーディング未完了なら /onboarding へ強制する。
export default function RequireAuth() {
  const { status, needsOnboarding } = useAuth()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />

  return <Outlet />
}

// /onboarding 専用。ログインは必要だが、オンボーディング完了は求めない。
export function RequireAuthOnly() {
  const { status } = useAuth()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />

  return <Outlet />
}

// /login, /login/verify 専用。既にログイン済みならホームへ戻す。
export function RedirectIfAuthenticated() {
  const { status, needsOnboarding } = useAuth()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'authenticated') return <Navigate to={needsOnboarding ? '/onboarding' : '/'} replace />

  return <Outlet />
}
