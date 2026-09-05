import { cn } from '@/utils/cn'

const SIZE_PX = { xs: 12, sm: 16, md: 20, lg: 36 }

export function Spinner({ size = 'md', className }) {
  const px = typeof size === 'number' ? size : SIZE_PX[size]

  return (
    <svg
      role="status"
      aria-label="Loading"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin', className)}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
