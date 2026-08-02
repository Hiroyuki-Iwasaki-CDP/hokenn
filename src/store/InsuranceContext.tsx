import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { FamilyMember, InsurancePolicy } from '../types/insurance'
import { SAMPLE_FAMILY, SAMPLE_POLICIES } from '../data/sampleData'

const STORAGE_KEY = 'wagaya-hoken-data-v1'

interface StoredData {
  family: FamilyMember[]
  policies: InsurancePolicy[]
}

function loadInitial(): StoredData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredData
      if (Array.isArray(parsed.family) && Array.isArray(parsed.policies)) {
        return parsed
      }
    }
  } catch {
    // 破損データは無視してサンプルデータから開始する
  }
  return { family: SAMPLE_FAMILY, policies: SAMPLE_POLICIES }
}

function genId(): string {
  return `policy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

interface InsuranceContextValue {
  family: FamilyMember[]
  policies: InsurancePolicy[]
  getMember: (id: string) => FamilyMember | undefined
  getPolicy: (id: string) => InsurancePolicy | undefined
  addPolicy: (policy: Omit<InsurancePolicy, 'id' | 'createdAt' | 'updatedAt'>) => string
  updatePolicy: (id: string, policy: Omit<InsurancePolicy, 'id' | 'createdAt' | 'updatedAt'>) => void
  deletePolicy: (id: string) => void
  resetToSample: () => void
}

const InsuranceContext = createContext<InsuranceContextValue | null>(null)

export function InsuranceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoredData>(() => loadInitial())

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // 保存容量超過などは静かに無視する(ローカル保存はベストエフォート)
    }
  }, [data])

  const getMember = useCallback((id: string) => data.family.find((m) => m.id === id), [data.family])
  const getPolicy = useCallback((id: string) => data.policies.find((p) => p.id === id), [data.policies])

  const addPolicy = useCallback((policy: Omit<InsurancePolicy, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const id = genId()
    setData((prev) => ({
      ...prev,
      policies: [...prev.policies, { ...policy, id, createdAt: now, updatedAt: now }],
    }))
    return id
  }, [])

  const updatePolicy = useCallback((id: string, policy: Omit<InsurancePolicy, 'id' | 'createdAt' | 'updatedAt'>) => {
    setData((prev) => ({
      ...prev,
      policies: prev.policies.map((p) =>
        p.id === id ? { ...policy, id, createdAt: p.createdAt, updatedAt: new Date().toISOString() } : p,
      ),
    }))
  }, [])

  const deletePolicy = useCallback((id: string) => {
    setData((prev) => ({ ...prev, policies: prev.policies.filter((p) => p.id !== id) }))
  }, [])

  const resetToSample = useCallback(() => {
    setData({ family: SAMPLE_FAMILY, policies: SAMPLE_POLICIES })
  }, [])

  const value = useMemo<InsuranceContextValue>(
    () => ({
      family: data.family,
      policies: data.policies,
      getMember,
      getPolicy,
      addPolicy,
      updatePolicy,
      deletePolicy,
      resetToSample,
    }),
    [data, getMember, getPolicy, addPolicy, updatePolicy, deletePolicy, resetToSample],
  )

  return <InsuranceContext.Provider value={value}>{children}</InsuranceContext.Provider>
}

export function useInsurance(): InsuranceContextValue {
  const ctx = useContext(InsuranceContext)
  if (!ctx) throw new Error('useInsurance must be used within InsuranceProvider')
  return ctx
}
