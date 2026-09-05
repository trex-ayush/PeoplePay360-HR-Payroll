import { forwardRef, useId } from 'react'
import { cn } from '@/utils/cn'

const SIZE_CLASSES = {
  sm: 'text-sm py-1.5',
  md: 'text-sm py-2',
  lg: 'text-base py-2.5',
}

export const Input = forwardRef(function Input(
  {
    iconLeft,
    iconRight,
    error,
    hint,
    label,
    inputSize = 'md',
    fullWidth = true,
    className,
    id,
    ...rest
  },
  ref
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorMessage = typeof error === 'string' ? error : undefined
  const hasError = Boolean(error)

  const base = cn(
    'w-full rounded-lg bg-white dark:bg-neutral-800 transition-colors',
    'border text-neutral-900 dark:text-neutral-100',
    'placeholder-neutral-400 dark:placeholder-neutral-500',
    'disabled:opacity-60 disabled:cursor-not-allowed',
    SIZE_CLASSES[inputSize],
    hasError
      ? 'border-red-400 dark:border-red-600 focus:border-red-500'
      : 'border-neutral-300 dark:border-neutral-600',
    iconLeft ? 'pl-9' : 'pl-3',
    iconRight ? 'pr-9' : 'pr-3',
    className
  )

  const field =
    iconLeft || iconRight ? (
      <div className="relative">
        {iconLeft ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-neutral-400">
            {iconLeft}
          </span>
        ) : null}
        <input ref={ref} id={inputId} className={base} {...rest} />
        {iconRight ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-neutral-400">
            {iconRight}
          </span>
        ) : null}
      </div>
    ) : (
      <input ref={ref} id={inputId} className={base} {...rest} />
    )

  if (!label && !errorMessage && !hint) {
    return fullWidth ? field : <div className="inline-block">{field}</div>
  }

  return (
    <div className={fullWidth ? 'w-full' : undefined}>
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          {label}
        </label>
      ) : null}
      {field}
      {errorMessage ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  )
})
