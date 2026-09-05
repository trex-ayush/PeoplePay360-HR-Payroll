import { useEffect, useRef } from 'react'
import { cn } from '@/utils/cn'

// `indeterminate` is a DOM property, not an attribute, so it has to be set on
// the node rather than passed as a prop.
export function Checkbox({ label, description, indeterminate, className, disabled, ...rest }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate)
  }, [indeterminate])

  return (
    <label
      className={cn(
        'inline-flex cursor-pointer select-none items-start gap-2.5 leading-tight',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        {...rest}
        className="mt-0.5 h-4 w-4 cursor-pointer rounded border-neutral-300 accent-primary-500 disabled:cursor-not-allowed dark:border-neutral-600"
      />
      {label || description ? (
        <span className="min-w-0 flex-1">
          {label ? (
            <span className="block text-sm text-neutral-900 dark:text-neutral-100">{label}</span>
          ) : null}
          {description ? (
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  )
}
