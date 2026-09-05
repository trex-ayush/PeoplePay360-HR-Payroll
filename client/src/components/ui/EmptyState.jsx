import { cn } from '@/utils/cn'

function DefaultIcon() {
  return (
    <svg
      className="w-12 h-12 mx-auto text-neutral-400 dark:text-neutral-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0-2.5 5a2 2 0 0 1-1.8 1H8.3a2 2 0 0 1-1.8-1L4 13m16 0h-4.6l-1 2h-4.8l-1-2H4"
      />
    </svg>
  )
}

export function EmptyState({ icon, title, description, action, compact = false, className }) {
  return (
    <div className={cn('text-center px-4', compact ? 'py-8' : 'py-16', className)}>
      {icon !== null ? <div className="mb-4">{icon ?? <DefaultIcon />}</div> : null}
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{title}</h3>
      {description ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
