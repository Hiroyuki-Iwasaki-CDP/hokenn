import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BriefcaseBusiness, History, LogOut, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '../../store/AuthContext'
import PrivacyFooter from './PrivacyFooter'
import { api } from '../../lib/api'
import type { AdvisorAppointment, AdvisorConsultation } from '../../types/insurance'

export default function AdvisorLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const refreshCount = () => Promise.all([
      api.get<{ appointments: AdvisorAppointment[] }>('/api/advisor/appointments'),
      api.get<{ consultations: AdvisorConsultation[] }>('/api/advisor/consultations'),
    ]).then(([appointmentData, consultationData]) => {
      const customerIds = new Set([
        ...appointmentData.appointments.filter((item) => item.status === 'requested').map((item) => item.customerId),
        ...consultationData.consultations.map((item) => item.customerId),
      ])
      setPendingCount(customerIds.size)
    }).catch(() => undefined)
    void refreshCount()
    const timer = window.setInterval(refreshCount, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-plane">
      <aside className="hidden w-60 shrink-0 flex-col bg-brand-900 px-4 py-6 text-brand-50 md:sticky md:top-0 md:flex md:h-screen md:overflow-y-auto">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
            <ShieldCheck size={18} strokeWidth={2.25} />
          </span>
          <span className="text-[15px] font-bold text-white">わが家の保険</span>
        </div>

        <p className="mb-4 rounded-xl bg-white/5 px-3 py-2.5 text-[11px] leading-relaxed text-brand-100">
          担当者用画面です。{user?.displayName ?? ''}さんとしてログイン中。
        </p>

        <nav className="flex flex-col gap-1">
          <NavLink
            to="/advisor"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive ? 'bg-brand-50 text-brand-900' : 'text-brand-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Users size={18} strokeWidth={2.25} />
            <span className="min-w-0 flex-1">顧客一覧・自分のプロフィール</span>
            {pendingCount > 0 && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">{pendingCount}</span>}
          </NavLink>
          <NavLink
            to="/advisor/activity"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-900' : 'text-brand-100 hover:bg-white/10 hover:text-white'}`
            }
          >
            <History size={18} strokeWidth={2.25} />操作履歴
          </NavLink>
          <NavLink
            to="/advisor/products"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive ? 'bg-brand-50 text-brand-900' : 'text-brand-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <BriefcaseBusiness size={18} strokeWidth={2.25} />
            取扱商品管理
          </NavLink>
        </nav>

        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-100 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={15} />
            ログアウト
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-line bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-700 text-white">
              <ShieldCheck size={16} strokeWidth={2.25} />
            </span>
            <span className="text-sm font-bold text-ink">わが家の保険(担当者用)</span>
          </div>
          <button type="button" onClick={handleLogout} className="text-xs font-semibold text-ink-secondary">
            ログアウト
          </button>
        </header>
        <nav className="grid grid-cols-3 border-b border-line bg-white md:hidden">
          <NavLink
            to="/advisor"
            end
            className={({ isActive }) =>
              `flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-bold ${
                isActive ? 'border-b-2 border-brand-700 text-brand-800' : 'text-ink-muted'
              }`
            }
          >
            <Users size={15} />
            顧客・相談{pendingCount > 0 && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-800">{pendingCount}</span>}
          </NavLink>
          <NavLink
            to="/advisor/activity"
            className={({ isActive }) =>
              `flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-bold ${isActive ? 'border-b-2 border-brand-700 text-brand-800' : 'text-ink-muted'}`
            }
          >
            <History size={15} />履歴
          </NavLink>
          <NavLink
            to="/advisor/products"
            className={({ isActive }) =>
              `flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-bold ${
                isActive ? 'border-b-2 border-brand-700 text-brand-800' : 'text-ink-muted'
              }`
            }
          >
            <BriefcaseBusiness size={15} />
            取扱商品
          </NavLink>
        </nav>
        <main className="flex-1 px-4 pt-6 pb-10 sm:px-6 md:px-10 md:pt-8">
          <div className="mx-auto max-w-3xl">
            <Outlet />
            <PrivacyFooter />
          </div>
        </main>
      </div>
    </div>
  )
}
