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
  Shapes,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId } from '../types/insurance'

export interface CategoryMeta {
  id: CategoryId
  label: string
  shortLabel: string
  icon: LucideIcon
  color: string // 主色(アイコン・グラフ用)
  description: string
}

// 表示順 = カラーパレットの視覚的識別性を検証済みの並び順(隣接ペアの誤認防止)
export const CATEGORY_ORDER: CategoryId[] = [
  'medical',
  'fire',
  'nursingCare',
  'injury',
  'cancer',
  'education',
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
  },
  fire: {
    id: 'fire',
    label: '火災・地震保険',
    shortLabel: '火災・地震',
    icon: Flame,
    color: '#eb6834',
    description: '火災や地震などによる住まいの損害に備えます。',
  },
  nursingCare: {
    id: 'nursingCare',
    label: '介護保障',
    shortLabel: '介護',
    icon: HeartHandshake,
    color: '#1baf7a',
    description: '介護が必要になったときの費用に備えます。',
  },
  injury: {
    id: 'injury',
    label: '傷害保障',
    shortLabel: '傷害',
    icon: Bandage,
    color: '#eda100',
    description: '不慮の事故によるケガに備えます。',
  },
  cancer: {
    id: 'cancer',
    label: 'がん保障',
    shortLabel: 'がん',
    icon: Ribbon,
    color: '#e87ba4',
    description: 'がんと診断されたときの一時金や治療費に備えます。',
  },
  education: {
    id: 'education',
    label: '学資・貯蓄',
    shortLabel: '学資・貯蓄',
    icon: PiggyBank,
    color: '#008300',
    description: '子どもの教育資金や将来のための貯蓄に備えます。',
  },
  liability: {
    id: 'liability',
    label: '個人賠償',
    shortLabel: '個人賠償',
    icon: Umbrella,
    color: '#00839e',
    description: '日常生活で他人にケガをさせたり物を壊したときに備えます。',
  },
  death: {
    id: 'death',
    label: '死亡保障',
    shortLabel: '死亡',
    icon: Gem,
    color: '#4a3aa7',
    description: '万が一のときに家族へ残すお金に備えます。',
  },
  auto: {
    id: 'auto',
    label: '自動車保険',
    shortLabel: '自動車',
    icon: Car,
    color: '#e34948',
    description: '自動車事故による損害に備えます。',
  },
  disability: {
    id: 'disability',
    label: '就業不能・所得保障',
    shortLabel: '就業不能',
    icon: Briefcase,
    color: '#643f9f',
    description: '働けなくなったときの収入減少に備えます。',
  },
  other: {
    id: 'other',
    label: 'その他',
    shortLabel: 'その他',
    icon: Shapes,
    color: '#ce69ad',
    description: '上記に当てはまらない保障です。',
  },
}

export function getCategory(id: CategoryId): CategoryMeta {
  return CATEGORIES[id]
}

// 16進カラーにアルファ値を付与した淡色背景を生成(バッジ・アイコン背景用)
export function tint(hex: string, alpha = '1a'): string {
  return `${hex}${alpha}`
}
