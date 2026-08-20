import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageCircle, Phone } from 'lucide-react'
import { api } from '../../lib/api'
import type { AdvisorProfile } from '../../types/insurance'

export default function AdvisorCard() {
  const [advisor, setAdvisor] = useState<AdvisorProfile | null>(null)
  const [managedByAdvisorAccount, setManagedByAdvisorAccount] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showContacts, setShowContacts] = useState(false)

  useEffect(() => {
    api
      .get<{ advisor: AdvisorProfile | null; managedByAdvisorAccount: boolean }>('/api/my-advisor')
      .then((data) => {
        setAdvisor(data.advisor)
        setManagedByAdvisorAccount(data.managedByAdvisorAccount)
      })
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded) return null

  if (!advisor || !advisor.advisorName) {
    return (
      <div className="rounded-xl bg-white/5 px-3 py-3 text-xs text-brand-100">
        <p>{managedByAdvisorAccount ? '担当者のプロフィールが未設定です。' : '担当FPの情報が未登録です。'}</p>
        {!managedByAdvisorAccount && (
          <Link to="/settings" className="mt-1 inline-block font-bold text-white hover:underline">
            設定から登録する
          </Link>
        )}
      </div>
    )
  }

  const initial = advisor.advisorName.slice(0, 1)
  const hasContact = advisor.officialLineUrl || advisor.phone || advisor.email

  return (
    <div className="rounded-xl bg-white/5 px-3 py-3">
      <p className="mb-2 text-[10px] font-bold tracking-wide text-brand-200 uppercase">保険の担当者</p>
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-800">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{advisor.advisorName}さん</p>
          {advisor.agencyName && <p className="truncate text-[11px] text-brand-100">{advisor.agencyName}</p>}
        </div>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-brand-100">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${advisor.isAcceptingInquiries ? 'bg-brand-300' : 'bg-brand-100/40'}`}
        />
        {advisor.isAcceptingInquiries ? '相談受付中' : '相談受付停止中'}
      </p>

      {hasContact && (
        <div className="relative mt-2.5">
          <button
            type="button"
            onClick={() => setShowContacts((v) => !v)}
            className="w-full rounded-lg bg-white px-3 py-2 text-xs font-bold text-brand-800 hover:bg-brand-50"
          >
            担当者に連絡
          </button>
          {showContacts && (
            <div className="absolute bottom-full left-0 z-20 mb-2 w-full space-y-1 rounded-lg border border-line bg-white p-1.5 shadow-lg">
              {advisor.officialLineUrl && (
                <a
                  href={advisor.officialLineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold text-ink hover:bg-plane"
                >
                  <MessageCircle size={14} />
                  公式LINE
                </a>
              )}
              {advisor.phone && (
                <a
                  href={`tel:${advisor.phone}`}
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold text-ink hover:bg-plane"
                >
                  <Phone size={14} />
                  電話 ({advisor.phone})
                </a>
              )}
              {advisor.email && (
                <a
                  href={`mailto:${advisor.email}`}
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-semibold text-ink hover:bg-plane"
                >
                  <Mail size={14} />
                  メール
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
