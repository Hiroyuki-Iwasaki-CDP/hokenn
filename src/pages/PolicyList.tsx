import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, X } from 'lucide-react'
import { useInsurance } from '../store/InsuranceContext'
import { ALL_FAMILY_ID, filterPoliciesByFamily } from '../lib/familyFilter'
import { CATEGORY_ORDER, getCategory } from '../lib/categories'
import { STATUS_META } from '../lib/status'
import type { PolicyStatus } from '../types/insurance'
import PolicyCard, { relationLabelOf } from '../components/policy/PolicyCard'
import FamilyTabs from '../components/dashboard/FamilyTabs'
import EmptyState from '../components/common/EmptyState'

const ALL = 'all'

export default function PolicyList() {
  const { family, policies } = useInsurance()
  const [selectedFamily, setSelectedFamily] = useState<string>(ALL_FAMILY_ID)
  const [category, setCategory] = useState<string>(ALL)
  const [insurer, setInsurer] = useState<string>(ALL)
  const [status, setStatus] = useState<string>(ALL)
  const [keyword, setKeyword] = useState('')

  const insurers = useMemo(
    () => Array.from(new Set(policies.map((p) => p.insurerName))).sort(),
    [policies],
  )

  const filtered = useMemo(() => {
    let result = filterPoliciesByFamily(policies, selectedFamily)
    if (category !== ALL) result = result.filter((p) => p.category === category)
    if (insurer !== ALL) result = result.filter((p) => p.insurerName === insurer)
    if (status !== ALL) result = result.filter((p) => p.status === status)
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase()
      result = result.filter(
        (p) => p.productName.toLowerCase().includes(k) || p.insurerName.toLowerCase().includes(k),
      )
    }
    return result
  }, [policies, selectedFamily, category, insurer, status, keyword])

  const getMemberName = (id: string) => family.find((m) => m.id === id)?.name ?? '—'
  const getMemberRelation = (id: string) => relationLabelOf(family.find((m) => m.id === id)?.relation ?? 'other')

  const hasActiveFilters = category !== ALL || insurer !== ALL || status !== ALL || keyword.trim() !== ''

  const resetFilters = () => {
    setCategory(ALL)
    setInsurer(ALL)
    setStatus(ALL)
    setKeyword('')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Your Policies</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">保険一覧</h1>
          <p className="mt-1 text-sm text-ink-secondary">加入している保険をまとめて確認できます。</p>
        </div>
        <Link
          to="/policies/new"
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
        >
          <Plus size={16} strokeWidth={2.5} />
          保険を登録
        </Link>
      </div>

      <FamilyTabs family={family} value={selectedFamily} onChange={setSelectedFamily} />

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="商品名・保険会社で検索"
            className="w-full rounded-xl border border-line bg-plane py-2.5 pr-3 pl-9 text-sm text-ink placeholder:text-ink-muted focus:border-brand-400 focus:bg-white focus:outline-none"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-line bg-plane px-3 py-2.5 text-sm text-ink focus:border-brand-400 focus:bg-white focus:outline-none"
        >
          <option value={ALL}>保障分野: すべて</option>
          {CATEGORY_ORDER.map((id) => (
            <option key={id} value={id}>
              {getCategory(id).label}
            </option>
          ))}
        </select>

        <select
          value={insurer}
          onChange={(e) => setInsurer(e.target.value)}
          className="rounded-xl border border-line bg-plane px-3 py-2.5 text-sm text-ink focus:border-brand-400 focus:bg-white focus:outline-none"
        >
          <option value={ALL}>保険会社: すべて</option>
          {insurers.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-line bg-plane px-3 py-2.5 text-sm text-ink focus:border-brand-400 focus:bg-white focus:outline-none"
        >
          <option value={ALL}>契約状態: すべて</option>
          {(Object.keys(STATUS_META) as PolicyStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-secondary hover:bg-plane"
          >
            <X size={14} />
            絞り込みを解除
          </button>
        )}
      </div>

      <p className="text-xs text-ink-muted">{filtered.length}件の保険が見つかりました</p>

      {filtered.length === 0 ? (
        <EmptyState
          title={
            policies.length === 0 ? 'まだ保険が登録されていません' : '条件に一致する保険が見つかりません'
          }
          description={
            policies.length === 0
              ? '保険証券をお手元に用意して、最初の1件を登録してみましょう。'
              : '絞り込み条件を変更するか、解除してお試しください。'
          }
          action={
            policies.length === 0 ? (
              <Link
                to="/policies/new"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
              >
                保険を登録する
              </Link>
            ) : (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink-secondary hover:bg-plane"
              >
                絞り込みを解除する
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
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
  )
}
