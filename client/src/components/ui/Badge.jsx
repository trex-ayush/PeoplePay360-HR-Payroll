import { cn } from '@/utils/cn'

const TONE_CLASSES = {
  neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200',
  primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
}

const OUTLINE_CLASSES = {
  neutral: 'border border-neutral-300 text-neutral-700 dark:border-neutral-600 dark:text-neutral-300',
  primary: 'border border-primary-400 text-primary-600 dark:text-primary-400',
  success: 'border border-green-400 text-green-600 dark:text-green-400',
  warning: 'border border-amber-400 text-amber-600 dark:text-amber-400',
  danger: 'border border-red-400 text-red-600 dark:text-red-400',
  info: 'border border-blue-400 text-blue-600 dark:text-blue-400',
  purple: 'border border-purple-400 text-purple-600 dark:text-purple-400',
  indigo: 'border border-indigo-400 text-indigo-600 dark:text-indigo-400',
}

const DOT_CLASSES = {
  neutral: 'bg-neutral-500',
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
}

const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
}

export function Badge({ children, tone = 'neutral', size = 'md', outline = false, dot = false, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        outline ? OUTLINE_CLASSES[tone] : TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className
      )}
    >
      {dot ? <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', DOT_CLASSES[tone])} /> : null}
      {children}
    </span>
  )
}
