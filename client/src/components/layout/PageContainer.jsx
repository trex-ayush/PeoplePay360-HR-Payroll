import { cn } from '@/utils/cn'

const MAX_WIDTH = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-screen-2xl',
  '2xl': 'max-w-[1920px]',
  full: 'max-w-none',
}

export function PageContainer({ children, maxWidth = 'xl', className, ...rest }) {
  return (
    <div
      className={cn('mx-auto p-4 sm:p-6 lg:p-8 2xl:p-10', MAX_WIDTH[maxWidth], className)}
      {...rest}
    >
      {children}
    </div>
  )
}
