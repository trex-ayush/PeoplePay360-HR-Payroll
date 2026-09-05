/**
 * A form field's value shown as text. Records open in this state so nothing is
 * editable until Edit is pressed — a stray keystroke can never change a record.
 */
export function ReadOnlyField({ label, children }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {children || <span className="font-normal text-neutral-400">—</span>}
      </p>
    </div>
  )
}
