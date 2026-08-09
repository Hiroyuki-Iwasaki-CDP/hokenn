import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import { InsuranceProvider } from './store/InsuranceContext'
import RequireAuth, { RedirectIfAuthenticated, RequireAuthOnly } from './components/auth/RequireAuth'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import VerifyCode from './pages/VerifyCode'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import PolicyList from './pages/PolicyList'
import PolicyDetail from './pages/PolicyDetail'
import PolicyForm from './pages/PolicyForm'
import Compare from './pages/Compare'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<Login />} />
            <Route path="/login/verify" element={<VerifyCode />} />
          </Route>

          <Route element={<RequireAuthOnly />}>
            <Route path="/onboarding" element={<Onboarding />} />
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
      </HashRouter>
    </AuthProvider>
  )
}
