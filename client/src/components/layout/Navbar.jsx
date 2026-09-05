import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui'
import { ROUTES } from '@/config/constants'
import { env } from '@/config/env'

const ROLE_LABELS = {
  employee: 'Employee',
  hr_manager: 'HR Manager',
  hr_payroll_user: 'HR Payroll User',
  hr_payroll_manager: 'HR Payroll Manager',
  admin: 'Admin',
}

export function Navbar() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate(ROUTES.login)
  }

  return (
    <header className="h-14 sm:h-16 flex items-center gap-2 px-3 bg-white dark:bg-neutral-800 shadow-[0_1px_0_0_#e5e5e5] dark:shadow-[0_1px_0_0_#404040] sticky top-0 z-[55] transition-colors duration-200">
      <Link to={ROUTES.dashboard} className="flex items-center gap-3 group flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold transition-transform duration-200 group-hover:scale-105">
          P
        </div>
        <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 hidden sm:inline">
          {env.appName}
        </span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
        >
          {isDark ? (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path strokeLinecap="round" d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
            </svg>
          )}
        </button>

        <div className="hidden sm:block text-right leading-tight">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{user.name}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {user.roles.map((role) => ROLE_LABELS[role]).join(', ')}
          </p>
        </div>

        <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {user.name.charAt(0).toUpperCase()}
        </div>

        <Button variant="secondary" size="sm" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
