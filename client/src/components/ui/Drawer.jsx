import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

const HORIZONTAL_SIZE = {
  sm: 'w-full sm:max-w-md',
  md: 'w-full sm:max-w-lg md:max-w-xl',
  lg: 'w-full sm:w-[70vw] md:w-[60vw] lg:w-[55vw]',
  xl: 'w-full sm:w-[85vw] md:w-[75vw] lg:w-[65vw]',
  full: 'w-full',
}

const VERTICAL_SIZE = {
  sm: 'h-1/3',
  md: 'h-1/2',
  lg: 'h-2/3',
  xl: 'h-3/4',
  full: 'h-screen',
}

const POSITION = {
  left: 'top-0 left-0 h-full',
  right: 'top-0 right-0 h-full',
  top: 'top-0 left-0 right-0 w-full',
  bottom: 'bottom-0 left-0 right-0 w-full',
}

const SLIDE_IN = {
  left: 'animate-[drawerInLeft_240ms_cubic-bezier(0.16,1,0.3,1)]',
  right: 'animate-[drawerInRight_240ms_cubic-bezier(0.16,1,0.3,1)]',
  top: 'animate-[drawerInTop_240ms_cubic-bezier(0.16,1,0.3,1)]',
  bottom: 'animate-[drawerInBottom_240ms_cubic-bezier(0.16,1,0.3,1)]',
}

export function Drawer({
  isOpen,
  onClose,
  side = 'right',
  size = 'md',
  title,
  description,
  closeOnBackdrop = true,
  closeOnEscape = true,
  hideCloseButton = false,
  children,
  footer,
  className,
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      if (closeOnEscape && e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, closeOnEscape, onClose])

  if (!isOpen) return null

  const isHorizontal = side === 'left' || side === 'right'

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/30 animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <aside
        className={cn(
          'absolute flex flex-col',
          'bg-white dark:bg-neutral-800 shadow-2xl border-neutral-200 dark:border-neutral-700',
          side === 'left' && 'border-r',
          side === 'right' && 'border-l',
          side === 'top' && 'border-b',
          side === 'bottom' && 'border-t',
          POSITION[side],
          isHorizontal ? HORIZONTAL_SIZE[size] : VERTICAL_SIZE[size],
          SLIDE_IN[side],
          className
        )}
      >
        {title || !hideCloseButton ? (
          <header className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-100 dark:border-neutral-700">
            <div className="min-w-0">
              {title ? (
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
              ) : null}
            </div>
            {!hideCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="flex-shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <X size={20} />
              </button>
            ) : null}
          </header>
        ) : null}

        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {footer ? (
          <footer className="flex-shrink-0 px-6 py-3 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-end gap-2">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body
  )
}
