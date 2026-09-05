import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ROUTES } from '@/config/constants'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to={ROUTES.dashboard} replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route
        path={ROUTES.login}
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
    </Routes>
  )
}
