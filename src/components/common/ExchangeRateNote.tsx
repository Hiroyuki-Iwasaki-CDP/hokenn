import { RefreshCw } from 'lucide-react'
import { formatRateDate } from '../../lib/format'
import { useExchangeRate } from '../../store/ExchangeRateContext'

export default function ExchangeRateNote({ compact = false }: { compact?: boolean }) {
  const { usdJpy, sourceDate, loading } = useExchangeRate()
  if (loading) return null
  if (usdJpy === null) return <p className="text-xs text-amber-700">為替レートを取得できませんでした。</p>

  return (
    <p className={`flex items-center gap-1.5 text-ink-muted ${compact ? 'text-[11px]' : 'rounded-xl bg-plane px-3.5 py-2.5 text-xs'}`}>
      <RefreshCw size={12} />
      1 USD = {usdJpy.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}円
      <span>（{formatRateDate(sourceDate)}の参考レート・毎日18時更新）</span>
    </p>
  )
}
