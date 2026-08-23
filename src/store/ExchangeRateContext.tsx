import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../lib/api'

interface ExchangeRateResponse {
  pair: 'USD_JPY'
  rate: number
  updatedAt: string
  source: string
  sourceDate: string | null
}

interface ExchangeRateContextValue {
  usdJpy: number | null
  updatedAt: string | null
  sourceDate: string | null
  loading: boolean
}

const ExchangeRateContext = createContext<ExchangeRateContextValue | null>(null)

export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ExchangeRateResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ExchangeRateResponse>('/api/exchange-rate').then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  const value = useMemo(() => ({
    usdJpy: data?.rate ?? null,
    updatedAt: data?.updatedAt ?? null,
    sourceDate: data?.sourceDate ?? null,
    loading,
  }), [data, loading])

  return <ExchangeRateContext.Provider value={value}>{children}</ExchangeRateContext.Provider>
}

export function useExchangeRate() {
  const context = useContext(ExchangeRateContext)
  if (!context) throw new Error('useExchangeRate must be used within ExchangeRateProvider')
  return context
}
