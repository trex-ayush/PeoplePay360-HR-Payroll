import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

const VARIANT_CLASSES = {
  primary:
    'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200',
  brand: 'bg-primary-500 text-white hover:bg-primary-600',
  dark: 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200',
  secondary:
    'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600 dark:hover:bg-neutral-700',
  ghost:
    'bg-transparent text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
  outline:
    'bg-transparent border border-neutral-300 text-neutral-800 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
  success: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
}

const SIZE_CLASSES = {
  xs: 'px-2 py-1 text-xs gap-1 rounded-md',
  sm: 'px-3 py-1 text-xs gap-1.5 rounded-lg',
  md: 'px-3 sm:px-4 py-1.5 text-xs sm:text-sm gap-1.5 sm:gap-2 rounded-lg',
  lg: 'px-4 py-2 text-sm gap-2 rounded-lg',
  xl: 'px-5 py-2.5 text-base gap-2 rounded-xl',
}

const SPINNER_PX = { xs: 12, sm: 12, md: 14, lg: 14, xl: 18 }

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? (
        <ButtonSpinner px={SPINNER_PX[size]} />
      ) : iconLeft ? (
        <span className="flex-shrink-0">{iconLeft}</span>
      ) : null}
      {children}
      {!loading && iconRight ? <span className="flex-shrink-0">{iconRight}</span> : null}
    </button>
  )
})

function ButtonSpinner({ px }) {
  return (
    <svg
      className="animate-spin flex-shrink-0"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
