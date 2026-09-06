import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Avatar, Dropdown, DropdownItem, DropdownDivider } from '@/components/ui'
import { AttendanceQuickAction } from '@/components/AttendanceQuickAction'
import { ROLE_LABELS, ROUTES } from '@/config/constants'
import { env } from '@/config/env'
import { cn } from '@/utils/cn'

export function Navbar() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate(ROUTES.login)
  }

  return (
    <header className="h-14 sm:h-16 flex items-center gap-2 px-3 bg-white dark:bg-neutral-800 shadow-[0_1px_0_0_#e5e5e5] dark:shadow-[0_1px_0_0_#404040] sticky top-0 z-[55] transition-colors duration-200">
      <Link to={ROUTES.dashboard} className="flex items-center gap-3 group flex-shrink-0">
        <img
          src="/logo.png"
          alt=""
          className="h-8 w-auto transition-transform duration-200 group-hover:scale-105"
        />
        <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 hidden sm:inline">
          {env.appName}
        </span>
      </Link>

      <div className="flex-1" />

      <AttendanceQuickAction />

      <Dropdown
        align="right"
        className="w-64"
        trigger={
          <span className="flex items-center gap-3 px-1.5 sm:px-3 py-1.5 sm:py-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors duration-200">
            <Avatar name={user.name} size="md" />
            <span className="hidden sm:block text-sm font-medium text-neutral-700 dark:text-neutral-300 max-w-[140px] truncate">
              {user.name}
            </span>
            <svg
              className="w-4 h-4 text-neutral-400 hidden sm:block"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        }
      >
        <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-700">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {user.name}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 truncate">
            {user.roles.map((role) => ROLE_LABELS[role]).join(', ')}
          </p>
        </div>

        {/* panel closes on any click inside it; theme switching should not */}
        <div
          className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-700"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">Theme</p>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-700/50">
            <ThemeOption
              active={theme === 'light'}
              onSelect={() => setTheme('light')}
              label="Light"
            />
            <ThemeOption active={theme === 'dark'} onSelect={() => setTheme('dark')} label="Dark" />
          </div>
        </div>

        <DropdownItem onSelect={() => navigate('/access')}>Access &amp; Roles</DropdownItem>

        <DropdownDivider />
        <DropdownItem danger onSelect={handleLogout}>
          Sign out
        </DropdownItem>
      </Dropdown>
    </header>
  )
}

function ThemeOption({ active, label, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex-1 px-2 py-1 text-xs font-medium rounded-md transition-colors',
        active
          ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm'
          : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
      )}
    >
      {label}
    </button>
  )
}
