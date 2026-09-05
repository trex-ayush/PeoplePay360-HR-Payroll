import { cn } from '@/utils/cn'

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-24 h-24 text-3xl',
}

export function Avatar({ name = '', size = 'md', className }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <span
      aria-label={name}
      className={cn(
        SIZE_CLASSES[size],
        'rounded-full bg-gradient-to-br from-neutral-600 to-neutral-800',
        'flex items-center justify-center text-white font-medium',
        className
      )}
    >
      {initial}
    </span>
  )
}
