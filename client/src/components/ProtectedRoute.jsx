import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/Spinner'

export function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-neutral-400">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !user.roles.some((role) => roles.includes(role))) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-lg font-semibold">Not available for your role</h1>
        <p className="mt-1 text-sm text-neutral-500">
          This page is limited to: {roles.join(', ')}
        </p>
      </div>
    )
  }

  return children
}
