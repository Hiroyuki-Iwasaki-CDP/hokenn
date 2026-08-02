import { useMemo, useState } from 'react'
import { Scale } from 'lucide-react'
import { useInsurance } from '../store/InsuranceContext'
import FamilyTabs from '../components/dashboard/FamilyTabs'
import ComparisonBar from '../components/compare/ComparisonBar'
import EmptyState from '../components/common/EmptyState'
import { ALL_FAMILY_ID, filterPoliciesByFamily, selectableFamilyTabs } from '../lib/familyFilter'
import { buildComparisonGroups } from '../lib/compare'
import { RELATION_LABEL } from '../lib/status'
import type { FamilyMember, InsurancePolicy } from '../types/insurance'

export default function Compare() {
  const { family, policies } = useInsurance()
  const [selectedFamily, setSelectedFamily] = useState<string>(ALL_FAMILY_ID)

  const sections = useMemo(() => {
    const members: FamilyMember[] =
      selectedFamily === ALL_FAMILY_ID ? selectableFamilyTabs(family) : family.filter((m) => m.id === selectedFamily)

    return members
      .map((member) => {
        const memberPolicies: InsurancePolicy[] = filterPoliciesByFamily(policies, member.id)
        return { member, groups: buildComparisonGroups(memberPolicies) }
      })
      .filter((s) => s.groups.length > 0)
  }, [family, policies, selectedFamily])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">Compare Coverage</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">保障を比べる</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          同じ分野に複数の保険がある場合に、保障額の内訳をまとめて確認できます。
        </p>
      </div>

      <FamilyTabs family={family} value={selectedFamily} onChange={setSelectedFamily} />

      {sections.length === 0 ? (
        <EmptyState
          icon={<Scale size={22} />}
          title="比較できる保障がまだありません"
          description="同じ分野(例: 医療保障)に2件以上の保険が登録されると、ここに比較が表示されます。1件のみの分野は表示されません。"
        />
      ) : (
        <div className="space-y-8">
          {sections.map(({ member, groups }) => (
            <div key={member.id}>
              {selectedFamily === ALL_FAMILY_ID && (
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
                  <span className="rounded-full bg-plane px-2.5 py-1 text-xs">{RELATION_LABEL[member.relation]}</span>
                  {member.name}
                </h2>
              )}
              <div className="space-y-4">
                {groups.map((g) => (
                  <ComparisonBar key={g.category} group={g} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="rounded-xl bg-plane px-4 py-3 text-xs leading-relaxed text-ink-secondary">
        この画面は登録された内容をもとに保障額を合計して表示しているだけです。必要な保障額の判断や、保険の解約・加入のご提案は行っていません。内容のご確認は保険証券や保険会社にお問い合わせください。
      </p>
    </div>
  )
}
