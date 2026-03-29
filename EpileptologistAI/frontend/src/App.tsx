import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { MonitoringProvider } from './lib/monitoring'
import Layout from './components/Layout'
import HomeWeb from './views/web/HomeWeb'
import Login from './views/web/Login'
import SignUp from './views/web/SignUp'
import DataDisplayPage from './views/web/DataDisplayPage'
import About from './views/web/About'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MonitoringProvider>
          <Layout>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><HomeWeb /></ProtectedRoute>} />
              <Route path="/data" element={<ProtectedRoute><DataDisplayPage /></ProtectedRoute>} />
              <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
            </Routes>
          </Layout>
        </MonitoringProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
