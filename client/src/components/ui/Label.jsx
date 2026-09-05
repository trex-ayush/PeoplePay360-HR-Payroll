import { cn } from '@/utils/cn'

export function Label({ required, children, className, ...rest }) {
  return (
    <label
      className={cn(
        'block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5',
        className
      )}
      {...rest}
    >
      {children}
      {required ? <span className="text-red-500 ml-0.5">*</span> : null}
    </label>
  )
}
