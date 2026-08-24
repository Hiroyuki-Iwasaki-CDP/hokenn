import type { InsurancePolicy } from '../types/insurance'
import { getCategory } from './categories'
import { CONTRACT_TYPE_LABEL, PREMIUM_FREQUENCY_LABEL, STATUS_META } from './status'

const headers = [
  '対象者', '契約者', '受取人', '保障分野', '保険会社', '商品名', '主契約名', '証券番号',
  '契約状態', '通貨', '保険料', '支払頻度', '保障額', '入院日額', '手術給付金', '診断給付金',
  '契約日', '契約タイプ', '更新日', '満期日', '保障終了年齢', '払込終了日', '払込終了年齢',
  '保障内容', '解約返戻金', '解約返戻金メモ', '特約', '担当者', '連絡先', '書類名メモ', 'メモ',
  '登録日時', '更新日時',
]

function protectSpreadsheetFormula(value: string): string {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value
}

function csvCell(value: string | number | null | undefined): string {
  const text = protectSpreadsheetFormula(value == null ? '' : String(value))
  return `"${text.replace(/"/g, '""')}"`
}

function policyRow(policy: InsurancePolicy): Array<string | number | null | undefined> {
  return [
    policy.insuredPersonName,
    policy.contractorName,
    policy.beneficiary,
    getCategory(policy.category).label,
    policy.insuranceCompany,
    policy.productName,
    policy.mainContractName,
    policy.policyNumber,
    STATUS_META[policy.status].label,
    policy.currency,
    policy.premiumAmount,
    PREMIUM_FREQUENCY_LABEL[policy.premiumFrequency],
    policy.coverageAmount,
    policy.hospitalizationDaily,
    policy.surgeryBenefit,
    policy.diagnosisBenefit,
    policy.contractDate,
    policy.contractType ? CONTRACT_TYPE_LABEL[policy.contractType] : null,
    policy.renewalDate,
    policy.maturityDate,
    policy.coverageEndAge,
    policy.premiumEndDate,
    policy.premiumEndAge,
    policy.coverageSummary,
    policy.hasCashValue ? 'あり' : 'なし',
    policy.cashValueNote,
    policy.riders.map((rider) => `${rider.name}${rider.active ? '' : '（停止）'}${rider.amount != null ? ` ${rider.amount}` : ''}${rider.note ? `：${rider.note}` : ''}`).join(' / '),
    policy.agentName,
    policy.contactInfo,
    policy.attachmentNames.join(' / '),
    policy.memo,
    policy.createdAt,
    policy.updatedAt,
  ]
}

export function createPoliciesCsv(policies: InsurancePolicy[]): string {
  const rows = [headers, ...policies.map(policyRow)]
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
}

export function downloadPoliciesCsv(policies: InsurancePolicy[]): void {
  const blob = new Blob([createPoliciesCsv(policies)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
  link.href = url
  link.download = `わが家の保険_${today}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
