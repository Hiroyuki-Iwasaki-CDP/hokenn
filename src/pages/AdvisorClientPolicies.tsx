import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, CalendarDays, Eye, FileText, ListChecks, ShieldCheck, Wallet } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { getCategory } from '../lib/categories'
import { sortByUpcoming, sumAnnualPremium, sumMonthlyPremiumInYen, toAnnualPremium, toMonthlyPremium } from '../lib/calculations'
import { formatDate, formatMoneyWithYen, formatUsd, formatYen } from '../lib/format'
import { CONTRACT_TYPE_LABEL, PREMIUM_FREQUENCY_LABEL, STATUS_META } from '../lib/status'
import type { InsurancePolicy } from '../types/insurance'
import CategoryIcon from '../components/common/CategoryIcon'
import PolicyStatusBadge from '../components/common/PolicyStatusBadge'
import ExchangeRateNote from '../components/common/ExchangeRateNote'
import { useExchangeRate } from '../store/ExchangeRateContext'
import FamilyTabs from '../components/dashboard/FamilyTabs'
import StatCard from '../components/common/StatCard'
import { ALL_FAMILY_ID, filterPoliciesByFamily, listInsuredPersons } from '../lib/familyFilter'

interface SharedPoliciesResponse {
  client: {
    id: string
    email: string
    displayName: string | null
  }
  sharingGrantedAt: string
  policies: InsurancePolicy[]
}

function Value({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-semibold whitespace-pre-wrap text-ink">{children || '—'}</dd>
    </div>
  )
}

function SharedPolicy({ policy }: { policy: InsurancePolicy }) {
  const category = getCategory(policy.category)
  const { usdJpy } = useExchangeRate()

  return (
    <details className="group rounded-2xl border border-line bg-white" open>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <CategoryIcon category={policy.category} />
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-plane px-2 py-0.5 text-[11px] font-semibold text-ink-secondary">
                {category.label}
              </span>
              <PolicyStatusBadge status={policy.status} />
            </div>
            <h2 className="line-clamp-2 break-words text-base font-bold text-ink">{policy.productName}</h2>
            <p className="truncate text-xs text-ink-muted">{policy.insuranceCompany}</p>
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold text-brand-700 group-open:hidden">詳細を開く</span>
        <span className="hidden shrink-0 text-xs font-semibold text-brand-700 group-open:inline">閉じる</span>
      </summary>

      <div className="space-y-6 border-t border-line px-5 py-5 sm:px-6">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Value label="契約者">{policy.contractorName ?? '—'}</Value>
          <Value label="被保険者">{policy.insuredPersonName}</Value>
          <Value label="受取人">{policy.beneficiary ?? '—'}</Value>
          <Value label="契約状態">{STATUS_META[policy.status].label}</Value>
          <Value label="保険会社">{policy.insuranceCompany}</Value>
          <Value label="商品名">{policy.productName}</Value>
          <Value label="主契約の内容">{policy.mainContractName ?? '—'}</Value>
          <Value label="証券番号">{policy.policyNumber ?? '—'}</Value>
          <Value label="通貨">{policy.currency === 'USD' ? 'ドル建て（USD）' : '円建て（JPY）'}</Value>
          <Value label="保障額">{formatMoneyWithYen(policy.coverageAmount, policy.currency, usdJpy)}</Value>
          <Value label="入院日額">{formatMoneyWithYen(policy.hospitalizationDaily, policy.currency, usdJpy, true)}</Value>
          <Value label="手術給付金">{formatMoneyWithYen(policy.surgeryBenefit, policy.currency, usdJpy)}</Value>
          <Value label="診断給付金">{formatMoneyWithYen(policy.diagnosisBenefit, policy.currency, usdJpy)}</Value>
          <Value label="保険料">
            {formatMoneyWithYen(policy.premiumAmount, policy.currency, usdJpy)} / {PREMIUM_FREQUENCY_LABEL[policy.premiumFrequency]}
          </Value>
          <Value label="年間換算額">{formatMoneyWithYen(toAnnualPremium(policy), policy.currency, usdJpy)}</Value>
          <Value label="契約日">{formatDate(policy.contractDate)}</Value>
          <Value label="契約タイプ">
            {policy.contractType ? CONTRACT_TYPE_LABEL[policy.contractType] : '—'}
          </Value>
          {policy.renewalDate && <Value label="次回更新日">{formatDate(policy.renewalDate)}</Value>}
          <Value label="満期日">{formatDate(policy.maturityDate)}</Value>
          <Value label="保障終了年齢">{policy.coverageEndAge ? `${policy.coverageEndAge}歳` : '—'}</Value>
          <Value label="払込満了日">{formatDate(policy.premiumEndDate)}</Value>
          <Value label="払込満了年齢">{policy.premiumEndAge ? `${policy.premiumEndAge}歳` : '—'}</Value>
          <Value label="解約返戻金・貯蓄性">{policy.hasCashValue ? 'あり' : 'なし'}</Value>
          <Value label="担当者">{policy.agentName ?? '—'}</Value>
          <Value label="問い合わせ先">{policy.contactInfo ?? '—'}</Value>
        </dl>

        {policy.coverageSummary && (
          <div>
            <p className="text-xs text-ink-muted">保障内容の要約</p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-ink">{policy.coverageSummary}</p>
          </div>
        )}

        {policy.riders.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-secondary">
              <ShieldCheck size={14} /> 特約
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {policy.riders.map((rider) => (
                <li key={rider.id} className="rounded-xl bg-plane px-3.5 py-3 text-sm text-ink">
                  <p className="font-semibold">{rider.name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {rider.active ? '有効' : '無効'} ・ {formatMoneyWithYen(rider.amount, policy.currency, usdJpy)}
                  </p>
                  {rider.note && <p className="mt-1 text-xs whitespace-pre-wrap text-ink-secondary">{rider.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {policy.cashValueNote && (
          <div>
            <p className="text-xs text-ink-muted">解約返戻金・貯蓄性のメモ</p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{policy.cashValueNote}</p>
          </div>
        )}

        {policy.memo && (
          <div>
            <p className="text-xs text-ink-muted">メモ</p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-ink">{policy.memo}</p>
          </div>
        )}

        {policy.attachmentNames.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-secondary">
              <FileText size={14} /> 登録された書類名
            </p>
            <ul className="space-y-1 text-sm text-ink">
              {policy.attachmentNames.map((name) => <li key={name}>・{name}</li>)}
            </ul>
          </div>
        )}
      </div>
      {policy.currency === 'USD' && <div className="px-5 pb-5 sm:px-6"><ExchangeRateNote /></div>}
    </details>
  )
}

function ClientOverview({ policies, selectedPerson }: { policies: InsurancePolicy[]; selectedPerson: string }) {
  const { usdJpy } = useExchangeRate()
  const filtered = useMemo(() => filterPoliciesByFamily(policies, selectedPerson), [policies, selectedPerson])
  const active = useMemo(() => filtered.filter((policy) => policy.status === 'active'), [filtered])
  const dollarPolicies = active.filter((policy) => policy.currency === 'USD')
  const exchangeRateUnavailable = usdJpy === null && dollarPolicies.length > 0
  const monthlyTotal = sumMonthlyPremiumInYen(active, usdJpy)
  const annualTotal = sumAnnualPremium(active, usdJpy)
  const dollarMonthly = dollarPolicies.reduce((sum, policy) => sum + toMonthlyPremium(policy), 0)
  const upcoming = sortByUpcoming(active).find((item) => item.days >= 0)
  const categories = [...new Set(active.map((policy) => getCategory(policy.category).label))]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="加入中の保険" value={active.length} unit="件" sub={`表示中 ${filtered.length}件`} icon={<ListChecks size={20} />} />
        <StatCard
          label={`毎月の保険料${exchangeRateUnavailable ? '（円建て分）' : ''}`}
          value={formatYen(Math.round(monthlyTotal)).replace('円', '')}
          unit="円"
          sub={<span className="space-y-0.5"><span className="block">年間約 {formatYen(Math.round(annualTotal))}</span>{dollarMonthly > 0 && <span className="block font-semibold text-brand-700">{exchangeRateUnavailable ? '別途ドル建て' : 'うちドル建て'} {formatUsd(dollarMonthly)}/月</span>}</span>}
          icon={<Wallet size={20} />}
        />
        <StatCard
          label="次の更新・満期"
          value={upcoming ? formatDate(upcoming.date).replace('日', '') : '—'}
          unit={upcoming ? '日' : ''}
          sub={upcoming ? `${upcoming.policy.productName}・あと${upcoming.days}日` : '登録された予定はありません'}
          icon={<CalendarDays size={20} />}
        />
      </div>
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-sm font-bold text-ink">保障分野の構成</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.length > 0 ? categories.map((category) => <span key={category} className="rounded-full bg-plane px-3 py-1.5 text-xs font-bold text-ink-secondary">{category}</span>) : <span className="text-sm text-ink-muted">加入中の保障分野はありません。</span>}
        </div>
      </div>
    </div>
  )
}

export default function AdvisorClientPolicies() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<SharedPoliciesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<string>(ALL_FAMILY_ID)

  const persons = useMemo(() => listInsuredPersons(data?.policies ?? []), [data])
  const displayedPolicies = useMemo(() => filterPoliciesByFamily(data?.policies ?? [], selectedPerson), [data, selectedPerson])

  useEffect(() => {
    if (!id) return
    setSelectedPerson(ALL_FAMILY_ID)
    api
      .get<SharedPoliciesResponse>(`/api/advisor/clients/${id}/policies`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : '保険情報を読み込めませんでした。'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="space-y-6">
      <Link to="/advisor" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-secondary hover:text-ink">
        <ArrowLeft size={16} />
        顧客一覧へ戻る
      </Link>

      {loading ? (
        <p className="text-sm text-ink-muted">読み込み中…</p>
      ) : error || !data ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
          {error ?? '指定された顧客が見つかりませんでした。'}
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Shared Policies</p>
            <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
              {data.client.displayName ?? data.client.email}さんの保険
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">契約者本人から全件共有の許可を受けています。</p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-brand-800">
            <Eye size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">閲覧専用</p>
              <p className="mt-0.5 text-xs leading-relaxed">
                この画面から契約内容を変更・削除することはできません。共有が解除されると直ちに閲覧できなくなります。
              </p>
            </div>
          </div>

          {data.policies.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-6 text-sm text-ink-muted">
              登録されている保険はありません。
            </div>
          ) : (
            <>
              <FamilyTabs persons={persons} value={selectedPerson} onChange={setSelectedPerson} />
              <ClientOverview policies={data.policies} selectedPerson={selectedPerson} />
              <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-base font-bold text-ink">共有された契約内容</h2><p className="mt-1 text-xs text-ink-muted">契約者本人が登録した内容です。証券原本との照合が必要です。</p></div><span className="text-xs font-semibold text-ink-muted">{displayedPolicies.length}件</span></div>
                {displayedPolicies.map((policy) => <SharedPolicy key={policy.id} policy={policy} />)}
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
