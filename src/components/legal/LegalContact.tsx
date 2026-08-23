import { OPERATOR_NAME, SUPPORT_EMAIL } from '../../config/service'

export default function LegalContact() {
  return (
    <dl className="grid gap-2 rounded-2xl border border-line bg-plane p-4 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="font-semibold text-ink">運営者</dt>
      <dd className="text-ink-secondary">{OPERATOR_NAME}</dd>
      <dt className="font-semibold text-ink">お問い合わせ</dt>
      <dd className="text-ink-secondary">
        {SUPPORT_EMAIL ? (
          <a className="font-semibold text-brand-700 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        ) : (
          'アプリ内に表示される担当者または運営窓口へご連絡ください。'
        )}
      </dd>
    </dl>
  )
}
