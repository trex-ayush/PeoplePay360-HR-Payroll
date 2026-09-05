import { useRef, useState } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { cn } from '@/utils/cn'

export function Dropdown({ trigger, children, align = 'left', className }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useClickOutside(ref, () => setOpen(false))

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex"
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-50 mt-2 min-w-[180px] overflow-hidden animate-fade-in',
            'rounded-lg border border-neutral-200 bg-white shadow-lg',
            'dark:border-neutral-700 dark:bg-neutral-800',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
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
