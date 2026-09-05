import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useClickOutside } from '@/hooks/useClickOutside'
import { cn } from '@/utils/cn'

const GAP = 8

export function Dropdown({ trigger, children, align = 'left', className }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({})
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  useClickOutside([triggerRef, menuRef], () => setOpen(false))

  // The menu lives in a portal so table and card overflow cannot clip it, which
  // means its position has to be measured off the trigger by hand.
  useLayoutEffect(() => {
    if (!open) return
    const rect = triggerRef.current.getBoundingClientRect()
    const height = menuRef.current.offsetHeight
    const openUp = rect.bottom + GAP + height > window.innerHeight

    setPosition({
      top: openUp ? rect.top - GAP - height : rect.bottom + GAP,
      ...(align === 'right' ? { right: window.innerWidth - rect.right } : { left: rect.left }),
    })
  }, [open, align])

  // A fixed menu cannot follow the page, so any scroll or resize dismisses it.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex"
      >
        {trigger}
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={position}
              onClick={() => setOpen(false)}
              className={cn(
                'fixed z-50 min-w-[180px] overflow-hidden animate-fade-in',
                'rounded-lg border border-neutral-200 bg-white shadow-lg',
                'dark:border-neutral-700 dark:bg-neutral-800',
                className
              )}
            >
              {children}
            </div>,
            document.body
          )
        : null}
    </>
  )
}

export function DropdownItem({ onSelect, disabled, danger, children }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'w-full px-3 py-2 text-left text-sm transition-colors',
        'hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-700',
        danger ? 'text-red-600 dark:text-red-400' : 'text-neutral-700 dark:text-neutral-200'
      )}
    >
      {children}
    </button>
  )
}

export function DropdownDivider() {
  return <div className="h-px bg-neutral-100 dark:bg-neutral-700" />
}
