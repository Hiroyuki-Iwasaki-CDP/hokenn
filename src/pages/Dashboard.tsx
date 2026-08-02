import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, Wallet, CalendarDays, ArrowRight } from 'lucide-react'
import { useInsurance } from '../store/InsuranceContext'
import FamilyTabs from '../components/dashboard/FamilyTabs'
import CoverageMap from '../components/dashboard/CoverageMap'
import CoverageTimeline from '../components/dashboard/CoverageTimeline'
import UpcomingList from '../components/dashboard/UpcomingList'
import StatCard from '../components/common/StatCard'
import PolicyCard, { relationLabelOf } from '../components/policy/PolicyCard'
import EmptyState from '../components/common/EmptyState'
import { ALL_FAMILY_ID, filterPoliciesByFamily } from '../lib/familyFilter'
import { sumAnnualPremium, sumMonthlyPremium, sortByUpcoming } from '../lib/calculations'
import { formatDate, formatYen } from '../lib/format'
import type { CategoryId } from '../types/insurance'

export default function Dashboard() {
  const { family, policies } = useInsurance()
  const [selectedFamily, setSelectedFamily] = useState<string>(ALL_FAMILY_ID)

  const selfMember = family.find((m) => m.relation === 'self')
  const greetingName = selfMember ? selfMember.name.split(' ')[0] : ''

  const filtered = useMemo(
    () => filterPoliciesByFamily(policies, selectedFamily),
    [policies, selectedFamily],
  )

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

  const getMemberName = (id: string) => family.find((m) => m.id === id)?.name ?? '—'
  const getMemberRelation = (id: string) => relationLabelOf(family.find((m) => m.id === id)?.relation ?? 'other')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Insurance Overview</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">こんにちは、{greetingName}さん</h1>
          <p className="mt-1 text-sm text-ink-secondary">いまの備えを、家族みんなで見渡しましょう。</p>
        </div>
        <Link
          to="/policies/new"
          className="hidden shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800 sm:flex"
        >
          保険を登録
        </Link>
      </div>

      <FamilyTabs family={family} value={selectedFamily} onChange={setSelectedFamily} />

      {policies.length === 0 ? (
        <EmptyState
          title="まだ保険が登録されていません"
          description="保険証券をお手元に用意して、最初の1件を登録してみましょう。"
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
              label="毎月の保険料"
              value={formatYen(Math.round(monthlyTotal)).replace('円', '')}
              unit="円"
              sub={`年間約 ${formatYen(Math.round(annualTotal))}`}
              icon={<Wallet size={20} />}
            />
            <StatCard
              label="次の更新・満期"
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

          <CoverageMap registeredCategories={registeredCategories} />

          <CoverageTimeline policies={activePolicies} getMemberName={getMemberName} />

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
              <EmptyState title="該当する保険がありません" description="家族の切り替えをご確認ください。" />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.slice(0, 6).map((p) => (
                  <PolicyCard
                    key={p.id}
                    policy={p}
                    insuredName={getMemberName(p.insuredMemberId)}
                    insuredRelation={getMemberRelation(p.insuredMemberId)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
