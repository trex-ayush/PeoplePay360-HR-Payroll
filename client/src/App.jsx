import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { ROUTES } from '@/config/constants'
import Login from '@/pages/Login'
import InviteAccept from '@/pages/InviteAccept'
import Dashboard from '@/pages/Dashboard'
import AccessMatrix from '@/pages/AccessMatrix'
import EmployeesList from '@/pages/employees/EmployeesList'
import SchedulesList from '@/pages/schedules/SchedulesList'
import DepartmentsList from '@/pages/departments/DepartmentsList'
import ContractsList from '@/pages/contracts/ContractsList'
import StructuresList from '@/pages/salary/StructuresList'
import StructureDetail from '@/pages/salary/StructureDetail'
import PayrunsList from '@/pages/payroll/PayrunsList'
import PayrunDetail from '@/pages/payroll/PayrunDetail'
import PayslipsList from '@/pages/payroll/PayslipsList'
import PayslipDetail from '@/pages/payroll/PayslipDetail'
import PayslipPrint from '@/pages/payroll/PayslipPrint'
import TimeOffRequestsList from '@/pages/timeoff/RequestsList'
import AllocationsList from '@/pages/timeoff/AllocationsList'
import TimeOffTypesList from '@/pages/timeoff/TypesList'
import AttendanceList from '@/pages/attendance/AttendanceList'

const HR = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']
const PAYROLL = ['hr_payroll_user', 'hr_payroll_manager', 'admin']

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
        path="/invite/:token"
        element={
          <PublicOnly>
            <InviteAccept />
          </PublicOnly>
        }
      />

      <Route
        path="/payslips/:id/print"
        element={
          <ProtectedRoute roles={PAYROLL}>
            <PayslipPrint />
          </ProtectedRoute>
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
        <Route path="/access" element={<AccessMatrix />} />

        <Route
          path="/employees"
          element={
            <ProtectedRoute roles={HR}>
              <EmployeesList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <ProtectedRoute roles={HR}>
              <ContractsList />
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
          path="/salary-structures"
          element={
            <ProtectedRoute roles={PAYROLL}>
              <StructuresList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <AttendanceList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/time-off/requests"
          element={
            <ProtectedRoute>
              <TimeOffRequestsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-off/allocations"
          element={
            <ProtectedRoute>
              <AllocationsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/time-off/types"
          element={
            <ProtectedRoute roles={HR}>
              <TimeOffTypesList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payruns"
          element={
            <ProtectedRoute roles={PAYROLL}>
              <PayrunsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payruns/:id"
          element={
            <ProtectedRoute roles={PAYROLL}>
              <PayrunDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payslips"
          element={
            <ProtectedRoute roles={PAYROLL}>
              <PayslipsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payslips/:id"
          element={
            <ProtectedRoute roles={PAYROLL}>
              <PayslipDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/salary-structures/:id"
          element={
            <ProtectedRoute roles={PAYROLL}>
              <StructureDetail />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
    </Routes>
  )
}
