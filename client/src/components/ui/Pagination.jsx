import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

export function Pagination({ page, pageSize, total, onPageChange, className }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const first = (page - 1) * pageSize + 1
  const last = Math.min(total, page * pageSize)

  const step = (delta) => onPageChange(Math.min(pages, Math.max(1, page + delta)))

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs text-neutral-500 dark:text-neutral-400',
        className
      )}
    >
      <span className="tabular-nums">
        Showing {first}–{last} of {total}
      </span>

      <div className="flex items-center gap-1">
        <PageButton onClick={() => step(-1)} disabled={page <= 1} label="Previous page">
          <ChevronLeft size={14} />
        </PageButton>
        <span className="px-2 tabular-nums">
          Page {page} of {pages}
        </span>
        <PageButton onClick={() => step(1)} disabled={page >= pages} label="Next page">
          <ChevronRight size={14} />
        </PageButton>
      </div>
    </div>
  )
}

function PageButton({ onClick, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-md border border-neutral-200 p-1 text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
    >
      {children}
    </button>
  )
}
