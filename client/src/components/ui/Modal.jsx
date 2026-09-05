import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FocusTrap } from 'focus-trap-react'
import { cn } from '@/utils/cn'

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] h-[95vh]',
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
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

  return createPortal(
    <FocusTrap
      focusTrapOptions={{
        initialFocus: false,
        fallbackFocus: '[data-modal-panel]',
        clickOutsideDeactivates: true,
        returnFocusOnDeactivate: true,
        escapeDeactivates: false,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          onClick={closeOnBackdrop ? onClose : undefined}
        />
        <div
          data-modal-panel
          tabIndex={-1}
          className={cn(
            'relative w-full max-h-[90vh] flex flex-col',
            'rounded-2xl bg-white dark:bg-neutral-800 shadow-2xl border border-neutral-200 dark:border-neutral-700',
            'overflow-hidden focus:outline-none',
            SIZE_CLASSES[size],
            className
          )}
        >
          {title || !hideCloseButton ? (
            <header className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-neutral-100 dark:border-neutral-700">
              <div>
                {title ? (
                  <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
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
                  aria-label="Close dialog"
                  className="ml-4 -mr-2 -mt-1 p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
            </header>
          ) : null}

          <div className="overflow-y-auto px-6 py-5 flex-1">{children}</div>

          {footer ? (
            <footer className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 flex items-center justify-end gap-2">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </FocusTrap>,
    document.body
  )
}
