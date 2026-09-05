import { Outlet } from 'react-router-dom'
import {
  CalendarClock,
  CalendarOff,
  Clock,
  FileText,
  Home,
  Layers,
  Receipt,
  Building2,
  Users,
  Wallet,
} from 'lucide-react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/context/AuthContext'

const HR = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']
const PAYROLL = ['hr_payroll_user', 'hr_payroll_manager', 'admin']

const iconProps = { size: 18, strokeWidth: 1.75 }

const SECTIONS = [
  {
    title: 'Workspace',
    items: [{ to: '/', label: 'Home', end: true, icon: <Home {...iconProps} /> }],
  },
  {
    title: 'People',
    items: [
      { to: '/employees', label: 'Employees', roles: HR, icon: <Users {...iconProps} /> },
      { to: '/contracts', label: 'Contracts', roles: HR, icon: <FileText {...iconProps} /> },
      { to: '/departments', label: 'Departments', roles: HR, icon: <Building2 {...iconProps} /> },
      {
        to: '/working-schedules',
        label: 'Working Schedules',
        roles: HR,
        icon: <CalendarClock {...iconProps} />,
      },
      { to: '/attendance', label: 'Attendance', icon: <Clock {...iconProps} /> },
      { to: '/time-off', label: 'Time Off', icon: <CalendarOff {...iconProps} /> },
    ],
  },
  {
    title: 'Payroll',
    items: [
      { to: '/payruns', label: 'Pay Runs', roles: PAYROLL, icon: <Wallet {...iconProps} /> },
      { to: '/payslips', label: 'Payslips', roles: PAYROLL, icon: <Receipt {...iconProps} /> },
      {
        to: '/salary-structures',
        label: 'Salary Structures',
        roles: PAYROLL,
        icon: <Layers {...iconProps} />,
      },
    ],
  },
]

export function AppShell() {
  const { user } = useAuth()

  const sections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || user.roles.some((role) => item.roles.includes(role))
    ),
  })).filter((section) => section.items.length > 0)

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar sections={sections} />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
