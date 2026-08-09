import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, Wallet, CalendarDays } from 'lucide-react'
import FamilyTabs from '../components/dashboard/FamilyTabs'
import CoverageMap from '../components/dashboard/CoverageMap'
import CoverageTimeline from '../components/dashboard/CoverageTimeline'
import UpcomingList from '../components/dashboard/UpcomingList'
import StatCard from '../components/common/StatCard'
import PolicyCard from '../components/policy/PolicyCard'
import { ALL_FAMILY_ID, filterPoliciesByFamily, listInsuredPersons } from '../lib/familyFilter'
import { sumAnnualPremium, sumMonthlyPremium, sortByUpcoming } from '../lib/calculations'
import { formatDate, formatYen } from '../lib/format'
import { DEMO_DISPLAY_NAME, DEMO_POLICIES } from '../data/sampleData'
import type { CategoryId } from '../types/insurance'

// ログイン不要の見た目だけのデモダッシュボード。サンプルデータのみを表示し、
// 登録・編集・削除やAPI呼び出しは一切行わない。
export default function DemoDashboard() {
  const [selectedFamily, setSelectedFamily] = useState<string>(ALL_FAMILY_ID)

  const persons = useMemo(() => listInsuredPersons(DEMO_POLICIES), [])
  const filtered = useMemo(() => filterPoliciesByFamily(DEMO_POLICIES, selectedFamily), [selectedFamily])
  const activePolicies = useMemo(() => filtered.filter((p) => p.status === 'active'), [filtered])

  const monthlyTotal = useMemo(() => sumMonthlyPremium(activePolicies), [activePolicies])
  const annualTotal = useMemo(() => sumAnnualPremium(activePolicies), [activePolicies])
  const upcoming = useMemo(() => sortByUpcoming(activePolicies), [activePolicies])
  const nextUpcoming = upcoming.find((u) => u.days >= 0) ?? upcoming[0]

  const registeredCategories = useMemo(() => {
    const set = new Set<CategoryId>()
    activePolicies.forEach((p) => set.add(p.category))
    return set
  }, [activePolicies])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Insurance Overview (Demo)</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">こんにちは、{DEMO_DISPLAY_NAME}さん</h1>
          <p className="mt-1 text-sm text-ink-secondary">いまの備えを、見渡しましょう。(サンプルデータ)</p>
        </div>
        <Link
          to="/login"
          className="hidden shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 sm:flex"
        >
          ログインして登録する
        </Link>
      </div>

      <FamilyTabs persons={persons} value={selectedFamily} onChange={setSelectedFamily} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="加入中の保険"
          value={activePolicies.length}
          unit="件"
          sub="すべて有効です"
          icon={<ListChecks size={20} />}
        />
        <StatCard
          label="毎月の保険料"
          value={formatYen(Math.round(monthlyTotal)).replace('円', '')}
          unit="円"
          sub={`年間約 ${formatYen(Math.round(annualTotal))}`}
          icon={<Wallet size={20} />}
        />
        <StatCard
          label="次の更新"
          value={nextUpcoming ? formatDate(nextUpcoming.date).replace('日', '') : '—'}
          unit={nextUpcoming ? '日' : ''}
          sub={
            nextUpcoming
              ? `${nextUpcoming.policy.productName}${nextUpcoming.days >= 0 ? `・あと${nextUpcoming.days}日` : ''}`
              : '登録された予定はありません'
          }
          icon={<CalendarDays size={20} />}
        />
      </div>

      <CoverageMap registeredCategories={registeredCategories} />

      <CoverageTimeline policies={activePolicies} />

      <UpcomingList items={upcoming} />

      <div>
        <h2 className="mb-3 text-sm font-bold text-ink">加入している保険</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PolicyCard key={p.id} policy={p} />
          ))}
        </div>
      </div>
    </div>
  )
}
