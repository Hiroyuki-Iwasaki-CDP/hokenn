import {
  Gem,
  Stethoscope,
  Ribbon,
  Briefcase,
  HeartHandshake,
  Bandage,
  Car,
  Flame,
  Umbrella,
  PiggyBank,
  Coins,
  Shapes,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId } from '../types/insurance'

export type CoverageFieldKey = 'coverageAmount' | 'hospitalizationDaily' | 'surgeryBenefit' | 'diagnosisBenefit'

export interface CategoryMeta {
  id: CategoryId
  label: string
  shortLabel: string
  icon: LucideIcon
  color: string // 主色(アイコン・グラフ用)
  description: string
  headline: CoverageFieldKey
  headlineLabel: string
  fields: CoverageFieldKey[]
  fieldLabels: Partial<Record<CoverageFieldKey, string>>
}

// 表示順 = カラーパレットの視覚的識別性を検証済みの並び順(隣接ペアの誤認防止)
export const CATEGORY_ORDER: CategoryId[] = [
  'medical',
  'fire',
  'nursingCare',
  'injury',
  'cancer',
  'education',
  'pension',
  'liability',
  'death',
  'auto',
  'disability',
  'other',
]

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  medical: {
    id: 'medical',
    label: '医療保障',
    shortLabel: '医療',
    icon: Stethoscope,
    color: '#2a78d6',
    description: '病気やケガでの入院・手術に備えます。',
    headline: 'hospitalizationDaily',
    headlineLabel: '入院日額',
    fields: ['hospitalizationDaily', 'surgeryBenefit', 'coverageAmount'],
    fieldLabels: {
      hospitalizationDaily: '入院日額',
      surgeryBenefit: '手術給付金',
      coverageAmount: 'その他保障額',
    },
  },
  fire: {
    id: 'fire',
    label: '火災・地震保険',
    shortLabel: '火災・地震',
    icon: Flame,
    color: '#eb6834',
    description: '火災や地震などによる住まいの損害に備えます。',
    headline: 'coverageAmount',
    headlineLabel: '建物・家財の保険金額',
    fields: ['coverageAmount'],
    fieldLabels: { coverageAmount: '建物・家財の保険金額' },
  },
  nursingCare: {
    id: 'nursingCare',
    label: '介護保障',
    shortLabel: '介護',
    icon: HeartHandshake,
    color: '#1baf7a',
    description: '介護が必要になったときの費用に備えます。',
    headline: 'coverageAmount',
    headlineLabel: '介護一時金・年金',
    fields: ['coverageAmount'],
    fieldLabels: { coverageAmount: '介護一時金・年金' },
  },
  injury: {
    id: 'injury',
    label: '傷害保障',
    shortLabel: '傷害',
    icon: Bandage,
    color: '#eda100',
    description: '不慮の事故によるケガに備えます。',
    headline: 'coverageAmount',
    headlineLabel: '保障額',
    fields: ['coverageAmount', 'hospitalizationDaily'],
    fieldLabels: { coverageAmount: '保障額', hospitalizationDaily: '入院日額' },
  },
  cancer: {
    id: 'cancer',
    label: 'がん保障',
    shortLabel: 'がん',
    icon: Ribbon,
    color: '#e87ba4',
    description: 'がんと診断されたときの一時金や治療費に備えます。',
    headline: 'diagnosisBenefit',
    headlineLabel: '診断給付金',
    fields: ['diagnosisBenefit', 'hospitalizationDaily'],
    fieldLabels: { diagnosisBenefit: '診断給付金', hospitalizationDaily: '入院日額' },
  },
  education: {
    id: 'education',
    label: '学資・貯蓄',
    shortLabel: '学資・貯蓄',
    icon: PiggyBank,
    color: '#008300',
    description: '子どもの教育資金や将来のための貯蓄に備えます。',
    headline: 'coverageAmount',
    headlineLabel: '満期学資金',
    fields: ['coverageAmount'],
    fieldLabels: { coverageAmount: '満期学資金' },
  },
  pension: {
    id: 'pension',
    label: '年金保険',
    shortLabel: '年金',
    icon: Coins,
    color: '#a06a00',
    description: '老後や将来受け取る年金に備えます。',
    headline: 'coverageAmount',
    headlineLabel: '年金受取額（年額）',
    fields: ['coverageAmount'],
    fieldLabels: { coverageAmount: '年金受取額（年額）' },
  },
  liability: {
    id: 'liability',
    label: '個人賠償',
    shortLabel: '個人賠償',
    icon: Umbrella,
    color: '#00839e',
    description: '日常生活で他人にケガをさせたり物を壊したときに備えます。',
    headline: 'coverageAmount',
    headlineLabel: '賠償限度額',
    fields: ['coverageAmount'],
    fieldLabels: { coverageAmount: '賠償限度額' },
  },
  death: {
    id: 'death',
    label: '死亡保障',
    shortLabel: '死亡',
    icon: Gem,
    color: '#4a3aa7',
    description: '万が一のときに家族へ残すお金に備えます。',
    headline: 'coverageAmount',
    headlineLabel: '死亡保険金',
    fields: ['coverageAmount'],
    fieldLabels: { coverageAmount: '死亡保険金' },
  },
  auto: {
    id: 'auto',
    label: '自動車保険',
    shortLabel: '自動車',
    icon: Car,
    color: '#e34948',
    description: '自動車事故による損害に備えます。',
    headline: 'coverageAmount',
    headlineLabel: '対人・対物補償',
    fields: ['coverageAmount'],
    fieldLabels: { coverageAmount: '対人・対物補償(上限)' },
  },
  disability: {
    id: 'disability',
    label: '就業不能・所得保障',
    shortLabel: '就業不能',
    icon: Briefcase,
    color: '#643f9f',
    description: '働けなくなったときの収入減少に備えます。',
    headline: 'coverageAmount',
    headlineLabel: '給付金額(月額)',
    fields: ['coverageAmount'],
    fieldLabels: { coverageAmount: '給付金額(月額)' },
  },
  other: {
    id: 'other',
    label: 'その他',
    shortLabel: 'その他',
    icon: Shapes,
    color: '#ce69ad',
    description: '上記に当てはまらない保障です。',
    headline: 'coverageAmount',
    headlineLabel: '保障額',
    fields: ['coverageAmount'],
    fieldLabels: { coverageAmount: '保障額' },
  },
}

export function getCategory(id: CategoryId): CategoryMeta {
  return CATEGORIES[id]
}

// 16進カラーにアルファ値を付与した淡色背景を生成(バッジ・アイコン背景用)
export function tint(hex: string, alpha = '1a'): string {
  return `${hex}${alpha}`
}
