import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { AuthUser } from '../types/insurance'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface SessionResponse {
  authenticated: boolean
  needsOnboarding?: boolean
  user?: AuthUser
}

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  needsOnboarding: boolean
  refresh: () => Promise<void>
  setUser: (user: AuthUser, needsOnboarding?: boolean) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUserState] = useState<AuthUser | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<SessionResponse>('/api/auth/session')
      if (data.authenticated && data.user) {
        setUserState(data.user)
        setNeedsOnboarding(!!data.needsOnboarding)
        setStatus('authenticated')
      } else {
        setUserState(null)
        setStatus('unauthenticated')
      }
    } catch {
      setUserState(null)
      setStatus('unauthenticated')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // needsOnboardingは呼び出し側が明示的に指定する(既定はfalse = 「オンボーディング完了」)。
  // ログイン直後(VerifyCode.tsx)はサーバーが返した実際の値を渡す必要がある。ここで無条件に
  // falseへ倒すと、新規ユーザーが初回設定(表示名・規約同意)を一度も通らずにダッシュボードへ
  // 直行してしまう(RedirectIfAuthenticatedがこのneedsOnboardingを見て遷移先を決めるため)。
  const setUser = useCallback((next: AuthUser, needsOnboardingNext = false) => {
    setUserState(next)
    setNeedsOnboarding(needsOnboardingNext)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } finally {
      setUserState(null)
      setStatus('unauthenticated')
    }
  }, [])

  return (
    <AuthContext.Provider value={{ status, user, needsOnboarding, refresh, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
