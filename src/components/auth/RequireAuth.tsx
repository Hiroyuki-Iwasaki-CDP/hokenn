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

function homePathFor(role: 'customer' | 'advisor' | undefined): string {
  return role === 'advisor' ? '/advisor' : '/'
}

// 顧客向けダッシュボード専用。未ログインなら/loginへ、未完了オンボーディングなら/onboardingへ、
// FPアカウントなら/advisorへ(顧客用画面とFP用画面は完全に分離する)。
export default function RequireAuth() {
  const { status, needsOnboarding, user } = useAuth()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  if (user?.role === 'advisor') return <Navigate to="/advisor" replace />

  return <Outlet />
}

// FP向けダッシュボード専用。顧客アカウントは顧客用トップへ戻す。
export function RequireAdvisor() {
  const { status, needsOnboarding, user } = useAuth()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  if (user?.role !== 'advisor') return <Navigate to="/" replace />

  return <Outlet />
}

export function RequireOperator() {
  const { status, needsOnboarding, user } = useAuth()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (needsOnboarding) return <Navigate to="/onboarding" replace />
  if (user?.role !== 'advisor') return <Navigate to="/" replace />
  if (!user.isOperator) return <Navigate to="/advisor" replace />

  return <Outlet />
}

// /onboarding 専用。ログインは必要だが、オンボーディング完了は求めない。
export function RequireAuthOnly() {
  const { status } = useAuth()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />

  return <Outlet />
}

// /login, /login/verify 専用。既にログイン済みなら役割に応じたホームへ戻す。
export function RedirectIfAuthenticated() {
  const { status, needsOnboarding, user } = useAuth()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'authenticated') {
    return <Navigate to={needsOnboarding ? '/onboarding' : homePathFor(user?.role)} replace />
  }

  return <Outlet />
}
