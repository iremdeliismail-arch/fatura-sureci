import type { ReactNode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { ToastViewport } from './components/ui/Toast'
import { AppProvider } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { AccountingReviewPage } from './pages/AccountingReviewPage'
import { ApprovalsPage } from './pages/ApprovalsPage'
import { AuditPage } from './pages/AuditPage'
import { DashboardPage } from './pages/DashboardPage'
import { DelegationsPage } from './pages/DelegationsPage'
import { InvoiceDetailPage, ValidateInvoicePage } from './pages/InvoiceDetailPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { LoginPage } from './pages/LoginPage'
import { MappingsPage } from './pages/MappingsPage'
import { NewInvoicePage } from './pages/NewInvoicePage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ReportsPage } from './pages/ReportsPage'
import type { Role } from './types'

function RoleRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/giris" replace />
  if (!roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function ApprovalToInvoiceRedirect() {
  const { id } = useParams()
  return <Navigate to={`/faturalar/${id}`} replace />
}

const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppProvider>
          <Router>
            <ToastViewport />
            <Routes>
              <Route path="/giris" element={<LoginPage />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
              <Route path="faturalar">
                <Route index element={<InvoicesPage />} />
                <Route
                  path="yeni"
                  element={
                    <RoleRoute roles={['accounting', 'admin']}>
                      <NewInvoicePage />
                    </RoleRoute>
                  }
                />
                <Route path=":id" element={<InvoiceDetailPage />} />
                <Route
                  path=":id/dogrula"
                  element={
                    <RoleRoute roles={['accounting', 'admin']}>
                      <ValidateInvoicePage />
                    </RoleRoute>
                  }
                />
              </Route>
                <Route
                  path="/onaylar"
                  element={
                    <RoleRoute roles={['accounting', 'manager', 'admin']}>
                      <ApprovalsPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/onaylar/:id"
                  element={<ApprovalToInvoiceRedirect />}
                />
                <Route
                  path="/muhasebe-kontrol"
                  element={
                    <RoleRoute roles={['accounting', 'admin']}>
                      <AccountingReviewPage />
                    </RoleRoute>
                  }
                />
                <Route path="/bildirimler" element={<NotificationsPage />} />
                <Route
                  path="/tanimlar"
                  element={
                    <RoleRoute roles={['accounting', 'admin']}>
                      <MappingsPage />
                    </RoleRoute>
                  }
                />
                <Route path="/vekalet" element={<DelegationsPage />} />
                <Route
                  path="/raporlar"
                  element={
                    <RoleRoute roles={['accounting', 'admin']}>
                      <ReportsPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/denetim"
                  element={
                    <RoleRoute roles={['accounting', 'admin']}>
                      <AuditPage />
                    </RoleRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AppProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
