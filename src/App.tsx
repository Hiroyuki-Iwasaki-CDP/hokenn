import { HashRouter, Routes, Route } from 'react-router-dom'
import { InsuranceProvider } from './store/InsuranceContext'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import PolicyList from './pages/PolicyList'
import PolicyDetail from './pages/PolicyDetail'
import PolicyForm from './pages/PolicyForm'
import Compare from './pages/Compare'

export default function App() {
  return (
    <InsuranceProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/policies" element={<PolicyList />} />
            <Route path="/policies/new" element={<PolicyForm />} />
            <Route path="/policies/:id" element={<PolicyDetail />} />
            <Route path="/policies/:id/edit" element={<PolicyForm />} />
            <Route path="/compare" element={<Compare />} />
          </Route>
        </Routes>
      </HashRouter>
    </InsuranceProvider>
  )
}
