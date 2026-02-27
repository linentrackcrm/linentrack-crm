import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Layout from '@/components/Layout/Layout'
import LoginPage from '@/pages/LoginPage'
import Dashboard from '@/pages/Dashboard'
import LeadsPage from '@/pages/LeadsPage'
import PipelinePage from '@/pages/PipelinePage'
import { AccountsPage, ContactsPage, ActivitiesPage } from '@/pages/AccountsPage'
import { ContractsPage, CampaignsPage, ReportsPage, SettingsPage } from '@/pages/OtherPages'
import EstimatesPage from '@/pages/EstimatesPage'
import EstimateBuilderPage from '@/pages/EstimateBuilderPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, gcTime: 1000 * 60 * 10, retry: 1, refetchOnWindowFocus: false },
  },
})

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-brand-600 font-bold text-lg">LinenTrack CRM</p>
        <p className="text-gray-400 text-sm mt-1">Loading your workspace...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontFamily:'Inter,sans-serif', fontSize:'14px' } }} />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"         element={<Dashboard />} />
              <Route path="leads"             element={<LeadsPage />} />
              <Route path="pipeline"          element={<PipelinePage />} />
              <Route path="accounts"          element={<AccountsPage />} />
              <Route path="contacts"          element={<ContactsPage />} />
              <Route path="activities"        element={<ActivitiesPage />} />
              <Route path="campaigns"         element={<CampaignsPage />} />
              <Route path="estimates"         element={<EstimatesPage />} />
              <Route path="estimates/new"     element={<EstimateBuilderPage />} />
              <Route path="estimates/:id/edit"element={<EstimateBuilderPage />} />
              <Route path="contracts"         element={<ContractsPage />} />
              <Route path="reports"           element={<ReportsPage />} />
              <Route path="settings"          element={<SettingsPage />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}
