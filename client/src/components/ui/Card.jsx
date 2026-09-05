import { cn } from '@/utils/cn'

const ELEVATION_CLASSES = {
  none: '',
  card: 'shadow-card',
  'card-hover': 'shadow-card-hover',
  soft: 'shadow-soft',
  'soft-md': 'shadow-soft-md',
}

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({
  children,
  interactive,
  elevation = 'card',
  padding = 'none',
  className,
  ...rest
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-neutral-200 dark:border-neutral-700',
        'bg-white dark:bg-neutral-800',
        ELEVATION_CLASSES[elevation],
        PADDING_CLASSES[padding],
        interactive && 'transition-shadow hover:shadow-card-hover cursor-pointer',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...rest }) {
  return (
    <div
      className={cn('px-4 py-3 border-b border-neutral-200 dark:border-neutral-700', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardBody({ children, className, ...rest }) {
  return (
    <div className={cn('p-4', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className, ...rest }) {
  return (
    <div
      className={cn(
        'px-4 py-3 border-t border-neutral-200 dark:border-neutral-700',
        'bg-neutral-50 dark:bg-neutral-900/50',
        'flex items-center justify-end gap-2',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
