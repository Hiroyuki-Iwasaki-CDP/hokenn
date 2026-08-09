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
  setUser: (user: AuthUser) => void
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

  const setUser = useCallback((next: AuthUser) => {
    setUserState(next)
    setNeedsOnboarding(false)
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
