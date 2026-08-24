import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, Wallet, CalendarDays, ArrowRight, ClipboardCheck } from 'lucide-react'
import { useInsurance } from '../store/InsuranceContext'
import { useAuth } from '../store/AuthContext'
import FamilyTabs from '../components/dashboard/FamilyTabs'
import CoverageMap from '../components/dashboard/CoverageMap'
import CoverageTimeline from '../components/dashboard/CoverageTimeline'
import UpcomingList from '../components/dashboard/UpcomingList'
import FamilySummary from '../components/dashboard/FamilySummary'
import StatCard from '../components/common/StatCard'
import PolicyCard from '../components/policy/PolicyCard'
import EmptyState from '../components/common/EmptyState'
import { ALL_FAMILY_ID, filterPoliciesByFamily, listInsuredPersons } from '../lib/familyFilter'
import { sumAnnualPremium, sumMonthlyPremiumInYen, sortByUpcoming, toAnnualPremium, toMonthlyPremium } from '../lib/calculations'
import { formatDate, formatRateDate, formatUsd, formatYen } from '../lib/format'
import type { CategoryId } from '../types/insurance'
import { useExchangeRate } from '../store/ExchangeRateContext'

export default function Dashboard() {
  const { policies, loading } = useInsurance()
  const { user } = useAuth()
  const { usdJpy, sourceDate } = useExchangeRate()
  const [selectedFamily, setSelectedFamily] = useState<string>(ALL_FAMILY_ID)

  const persons = useMemo(() => listInsuredPersons(policies), [policies])

  const filtered = useMemo(
    () => filterPoliciesByFamily(policies, selectedFamily),
    [policies, selectedFamily],
  )

  const activePolicies = useMemo(() => filtered.filter((p) => p.status === 'active'), [filtered])
  const dollarPolicies = useMemo(() => activePolicies.filter((policy) => policy.currency === 'USD'), [activePolicies])

  const monthlyTotal = useMemo(() => sumMonthlyPremiumInYen(activePolicies, usdJpy), [activePolicies, usdJpy])
  const annualTotal = useMemo(() => sumAnnualPremium(activePolicies, usdJpy), [activePolicies, usdJpy])
  const monthlyDollarTotal = useMemo(
    () => dollarPolicies.reduce((sum, policy) => sum + toMonthlyPremium(policy), 0),
    [dollarPolicies],
  )
  const annualDollarTotal = useMemo(
    () => dollarPolicies.reduce((sum, policy) => sum + toAnnualPremium(policy), 0),
    [dollarPolicies],
  )
  const upcoming = useMemo(() => sortByUpcoming(activePolicies), [activePolicies])
  const nextUpcoming = upcoming.find((u) => u.days >= 0) ?? upcoming[0]

  const registeredCategories = useMemo(() => {
    const set = new Set<CategoryId>()
    activePolicies.forEach((p) => set.add(p.category))
    return set
  }, [activePolicies])

  if (loading) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Insurance Overview</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">こんにちは、{user?.displayName ?? ''}さん</h1>
          <p className="mt-1 text-sm text-ink-secondary">いまの備えを、見渡しましょう。</p>
        </div>
        <Link
          to="/policies/new"
          className="hidden shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 sm:flex"
        >
          保険を登録
        </Link>
      </div>

      <FamilyTabs persons={persons} value={selectedFamily} onChange={setSelectedFamily} />

      {policies.length === 0 ? (
        <EmptyState
          title="まだ保険が登録されていません"
          description="まずはお手元の保険証券を見ながら登録してみましょう"
          action={
            <Link
              to="/policies/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
            >
              保険を登録する
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="加入中の保険"
              value={activePolicies.length}
              unit="件"
              sub={`すべて有効です`}
              icon={<ListChecks size={20} />}
            />
            <StatCard
              label={selectedFamily === ALL_FAMILY_ID ? '家族全体の毎月の保険料' : `${selectedFamily}の毎月の保険料`}
              value={formatYen(Math.round(monthlyTotal)).replace('円', '')}
              unit="円"
              sub={
                <span className="space-y-0.5">
                  <span className="block">年間約 {formatYen(Math.round(annualTotal))}</span>
                  {dollarPolicies.length > 0 && (
                    <span className="block font-semibold text-brand-700">
                      うちドル建て {formatUsd(monthlyDollarTotal)}/月・{formatUsd(annualDollarTotal)}/年
                    </span>
                  )}
                  <span className="block text-[11px]">
                    換算レート {usdJpy === null
                      ? '取得できませんでした'
                      : `1 USD = ${usdJpy.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}円（${formatRateDate(sourceDate)}）`}
                  </span>
                </span>
              }
              icon={<Wallet size={20} />}
            />
            <StatCard
              label="次の更新"
              value={nextUpcoming ? formatDate(nextUpcoming.date).replace('日', '') : '—'}
              unit={nextUpcoming ? '日' : ''}
              sub={
                nextUpcoming
                  ? `${nextUpcoming.policy.productName}${
                      nextUpcoming.days >= 0 ? `・あと${nextUpcoming.days}日` : ''
                    }`
                  : '登録された予定はありません'
              }
              icon={<CalendarDays size={20} />}
            />
          </div>

          {selectedFamily === ALL_FAMILY_ID && <FamilySummary policies={policies} persons={persons} usdJpy={usdJpy} onSelect={setSelectedFamily} />}

          <CoverageMap registeredCategories={registeredCategories} />

          <Link
            to="/consultation"
            className="flex flex-col gap-3 rounded-2xl bg-brand-900 p-5 text-white shadow-sm transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <span className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><ClipboardCheck size={21} /></span>
              <span><strong className="block text-base">保険の見える化レポート</strong><span className="mt-1 block text-xs leading-relaxed text-brand-100">登録内容の確認ポイントを整理して、担当者へ相談日時を送れます。</span></span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-bold">レポートを見る<ArrowRight size={16} /></span>
          </Link>

          <CoverageTimeline policies={activePolicies} />

          <UpcomingList items={upcoming} />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">加入している保険</h2>
              <Link to="/policies" className="flex items-center gap-1 text-xs font-semibold text-brand-700">
                すべて見る
                <ArrowRight size={14} />
              </Link>
            </div>
            {filtered.length === 0 ? (
              <EmptyState title="該当する保険がありません" description="対象者の切り替えをご確認ください。" />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.slice(0, 6).map((p) => (
                  <PolicyCard key={p.id} policy={p} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
