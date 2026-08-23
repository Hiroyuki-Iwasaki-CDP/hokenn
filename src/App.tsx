import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import { InsuranceProvider } from './store/InsuranceContext'
import RequireAuth, { RedirectIfAuthenticated, RequireAdvisor, RequireAuthOnly } from './components/auth/RequireAuth'
import AppLayout from './components/layout/AppLayout'
import AdvisorLayout from './components/layout/AdvisorLayout'
import DemoLayout from './components/layout/DemoLayout'
import Login from './pages/Login'
import VerifyCode from './pages/VerifyCode'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import AdvisorDashboard from './pages/AdvisorDashboard'
import AdvisorClientPolicies from './pages/AdvisorClientPolicies'
import DemoDashboard from './pages/DemoDashboard'
import PolicyList from './pages/PolicyList'
import PolicyDetail from './pages/PolicyDetail'
import PolicyForm from './pages/PolicyForm'
import Compare from './pages/Compare'
import Settings from './pages/Settings'
import LegalLayout from './components/layout/LegalLayout'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Products from './pages/Products'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<LegalLayout />}>
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/products" element={<Products />} />
          </Route>

          {/* ログイン不要の見た目だけのデモ画面。サンプルデータのみで、実データ・実APIには触れない。 */}
          <Route element={<DemoLayout />}>
            <Route path="/demo" element={<DemoDashboard />} />
          </Route>

          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<Login />} />
            <Route path="/login/verify" element={<VerifyCode />} />
          </Route>

          <Route element={<RequireAuthOnly />}>
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>

          <Route element={<RequireAdvisor />}>
            <Route element={<AdvisorLayout />}>
              <Route path="/advisor" element={<AdvisorDashboard />} />
              <Route path="/advisor/clients/:id" element={<AdvisorClientPolicies />} />
            </Route>
          </Route>

          <Route element={<RequireAuth />}>
            <Route
              element={
                <InsuranceProvider>
                  <AppLayout />
                </InsuranceProvider>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/policies" element={<PolicyList />} />
              <Route path="/policies/new" element={<PolicyForm />} />
              <Route path="/policies/:id" element={<PolicyDetail />} />
              <Route path="/policies/:id/edit" element={<PolicyForm />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
