import { X } from 'lucide-react'

export function EmployeeFilterChip({ employee, onClear }) {
  if (!employee) return null

  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
    >
      Filtered to {employee.name}
      <X size={13} />
    </button>
  )
}
