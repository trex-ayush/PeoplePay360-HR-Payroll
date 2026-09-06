import { NavLink } from 'react-router-dom'
import { useUI } from '@/context/UIContext'
import { cn } from '@/utils/cn'

export function Sidebar({ sections }) {
  const { sidebarCollapsed, toggleSidebar } = useUI()

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col flex-shrink-0 transition-all duration-200',
        'sticky self-start top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]',
        'bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <nav className="flex flex-1 flex-col overflow-y-auto p-3">
        {sections.map((section, index) => (
          <div
            key={section.title}
            className={cn(
              'mb-1',
              // Collapsed there is no heading to separate the groups, so a hairline does it.
              sidebarCollapsed &&
                index > 0 &&
                'mt-1.5 border-t border-neutral-100 pt-1.5 dark:border-neutral-700/60'
            )}
          >
            {section.title && !sidebarCollapsed ? (
              <p className="px-3 pb-0.5 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {section.title}
              </p>
            ) : null}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg text-sm transition-colors',
                    sidebarCollapsed
                      ? 'mx-auto my-0.5 h-9 w-9 justify-center'
                      : 'gap-2.5 px-3 py-1.5',
                    isActive
                      ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-medium'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                  )
                }
              >
                {item.icon ? <span className="flex-shrink-0">{item.icon}</span> : null}
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(
          'flex items-center gap-2 px-3 py-3 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200',
          'border-t border-neutral-100 dark:border-neutral-700',
          sidebarCollapsed && 'justify-center'
        )}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {!sidebarCollapsed && <span>Collapse</span>}
      </button>
    </aside>
  )
}
