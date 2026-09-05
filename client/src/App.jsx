import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ROUTES } from '@/config/constants'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import EmployeesList from '@/pages/employees/EmployeesList'
import EmployeeForm from '@/pages/employees/EmployeeForm'
import SchedulesList from '@/pages/schedules/SchedulesList'
import ScheduleForm from '@/pages/schedules/ScheduleForm'
import DepartmentsList from '@/pages/departments/DepartmentsList'

const HR = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']

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

        <Route
          path="/employees"
          element={
            <ProtectedRoute roles={HR}>
              <EmployeesList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <ProtectedRoute roles={HR}>
              <EmployeeForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/departments"
          element={
            <ProtectedRoute roles={HR}>
              <DepartmentsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/working-schedules"
          element={
            <ProtectedRoute roles={HR}>
              <SchedulesList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/working-schedules/:id"
          element={
            <ProtectedRoute roles={HR}>
              <ScheduleForm />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
    </Routes>
  )
}
