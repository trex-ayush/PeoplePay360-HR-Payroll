import { cn } from '@/utils/cn'

export function Stepper({ steps, current, className, onStepClick }) {
  return (
    <ol className={cn('flex items-start gap-2', className)}>
      {steps.map((step, idx) => {
        const isComplete = idx < current
        const isActive = idx === current
        const interactive = Boolean(onStepClick) && idx <= current

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center">
            <button
              type="button"
              onClick={interactive ? () => onStepClick(idx) : undefined}
              disabled={!interactive}
              className={cn(
                'flex items-center gap-2 text-left',
                interactive ? 'cursor-pointer' : 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  isComplete && 'bg-primary-500 text-white',
                  isActive && 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900',
                  !isComplete &&
                    !isActive &&
                    'bg-neutral-100 text-neutral-500 dark:bg-neutral-700'
                )}
              >
                {isComplete ? (
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-medium',
                    isActive
                      ? 'text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-600 dark:text-neutral-300'
                  )}
                >
                  {step.label}
                </span>
                {step.description ? (
                  <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                    {step.description}
                  </span>
                ) : null}
              </span>
            </button>

            {idx < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'mx-2 h-px flex-1 transition-colors',
                  isComplete ? 'bg-primary-500' : 'bg-neutral-200 dark:bg-neutral-700'
                )}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
