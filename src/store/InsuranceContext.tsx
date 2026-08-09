import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { InsurancePolicy, PolicyInput } from '../types/insurance'

interface PoliciesResponse {
  policies: InsurancePolicy[]
}

interface PolicyResponse {
  policy: InsurancePolicy
}

interface InsuranceContextValue {
  policies: InsurancePolicy[]
  loading: boolean
  error: string | null
  getPolicy: (id: string) => InsurancePolicy | undefined
  addPolicy: (input: PolicyInput) => Promise<string>
  updatePolicy: (id: string, input: PolicyInput) => Promise<void>
  deletePolicy: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const InsuranceContext = createContext<InsuranceContextValue | null>(null)

function toApiPayload(input: PolicyInput) {
  return {
    ...input,
    policyNumber: input.policyNumber.trim() || null,
    coverageSummary: input.coverageSummary.trim() || null,
    contractDate: input.contractDate || null,
    renewalDate: input.renewalDate || null,
    memo: input.memo.trim() || null,
  }
}

export function InsuranceProvider({ children }: { children: ReactNode }) {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<PoliciesResponse>('/api/policies')
      setPolicies(data.policies)
    } catch {
      setError('保険情報の取得に失敗しました。ページを再読み込みしてください。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const getPolicy = useCallback((id: string) => policies.find((p) => p.id === id), [policies])

  const addPolicy = useCallback(async (input: PolicyInput) => {
    const data = await api.post<PolicyResponse>('/api/policies', toApiPayload(input))
    setPolicies((prev) => [...prev, data.policy])
    return data.policy.id
  }, [])

  const updatePolicy = useCallback(async (id: string, input: PolicyInput) => {
    const data = await api.put<PolicyResponse>(`/api/policies/${id}`, toApiPayload(input))
    setPolicies((prev) => prev.map((p) => (p.id === id ? data.policy : p)))
  }, [])

  const deletePolicy = useCallback(async (id: string) => {
    await api.del(`/api/policies/${id}`)
    setPolicies((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const value = useMemo<InsuranceContextValue>(
    () => ({ policies, loading, error, getPolicy, addPolicy, updatePolicy, deletePolicy, refresh }),
    [policies, loading, error, getPolicy, addPolicy, updatePolicy, deletePolicy, refresh],
  )

  return <InsuranceContext.Provider value={value}>{children}</InsuranceContext.Provider>
}

export function useInsurance(): InsuranceContextValue {
  const ctx = useContext(InsuranceContext)
  if (!ctx) throw new Error('useInsurance must be used within InsuranceProvider')
  return ctx
}
