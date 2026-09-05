import { cn } from '@/utils/cn'

const ROUNDED = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
}

export function Skeleton({ height, width, rounded = 'md', className, style, ...rest }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse bg-neutral-200/70 dark:bg-neutral-700/70', ROUNDED[rounded], className)}
      style={{ height, width, ...style }}
      {...rest}
    />
  )
}
