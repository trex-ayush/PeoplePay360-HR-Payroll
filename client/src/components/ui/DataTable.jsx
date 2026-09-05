import { useMemo, useState } from 'react'
import { cn } from '@/utils/cn'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'

const DENSITY_CELL = {
  compact: 'px-3 py-1.5',
  normal: 'px-4 py-3',
  comfortable: 'px-5 py-4',
}

const DENSITY_HEAD = {
  compact: 'px-3 py-2',
  normal: 'px-4 py-3',
  comfortable: 'px-5 py-3.5',
}

const ROUNDED_CLASS = {
  sharp: 'rounded-none',
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
}

export function DataTable({
  columns,
  rows = [],
  rowKey,
  onRowClick,
  loading = false,
  loadingRows = 5,
  error = null,
  onRetry,
  emptyState,
  sort: controlledSort,
  onSortChange,
  stickyHeader = false,
  density = 'normal',
  rounded = 'sharp',
  className,
}) {
  const [internalSort, setInternalSort] = useState(undefined)
  const sort = controlledSort ?? internalSort

  const handleSort = (col) => {
    if (!col.sortable) return
    const direction = sort?.key === col.key && sort.direction === 'asc' ? 'desc' : 'asc'
    const next = { key: col.key, direction }
    if (controlledSort) onSortChange?.(next)
    else setInternalSort(next)
  }

  const sorted = useMemo(() => {
    if (!sort || controlledSort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.compare) return rows
    const next = [...rows].sort(col.compare)
    return sort.direction === 'desc' ? next.reverse() : next
  }, [rows, sort, controlledSort, columns])

  if (error) return <ErrorState description={error.message} onRetry={onRetry} />

  return (
    <div
      className={cn(
        ROUNDED_CLASS[rounded],
        'border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className={cn(
              'bg-neutral-50 dark:bg-neutral-900',
              'border-b border-neutral-200 dark:border-neutral-700',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr>
              {columns.map((col) => {
                const isSorted = sort?.key === col.key
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                    style={{ width: col.width }}
                    className={cn(
                      DENSITY_HEAD[density],
                      'font-medium text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wider select-none',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      !col.align && 'text-left',
                      col.sortable &&
                        'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors',
                      col.headerClassName
                    )}
                    onClick={() => handleSort(col)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable ? (
                        <SortGlyph
                          active={isSorted}
                          direction={isSorted ? sort.direction : undefined}
                        />
                      ) : null}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {loading ? (
              Array.from({ length: loadingRows }).map((_, rowIdx) => (
                <tr key={`skeleton-${rowIdx}`}>
                  {columns.map((col) => (
                    <td key={col.key} className={DENSITY_CELL[density]}>
                      <Skeleton height={14} width="70%" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={cn(DENSITY_CELL[density], 'py-12')}>
                  {emptyState ?? <EmptyState title="No results" />}
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={String(rowKey(row))}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        DENSITY_CELL[density],
                        'text-neutral-900 dark:text-neutral-100 align-middle',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.className
                      )}
                    >
                      {col.cell ? col.cell(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortGlyph({ active, direction }) {
  return (
    <svg
      className={cn('h-3 w-3 transition-opacity', active ? 'opacity-100' : 'opacity-30')}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 3l3 4H5l3-4z" opacity={!active || direction === 'asc' ? 1 : 0.3} />
      <path d="M8 13l3-4H5l3 4z" opacity={!active || direction === 'desc' ? 1 : 0.3} />
    </svg>
  )
}
