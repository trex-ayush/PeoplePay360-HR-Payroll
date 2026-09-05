import { MoreVertical } from 'lucide-react'
import { Dropdown, DropdownDivider, DropdownItem } from '@/components/ui'

function KebabTrigger() {
  return (
    <span className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200">
      <MoreVertical size={16} />
    </span>
  )
}

/**
 * Row menu for list views: Edit and Delete. Stops propagation so opening the
 * menu never triggers the row's click.
 */
export function RowActions({ onEdit, onDelete, deleteLabel = 'Delete' }) {
  return (
    <span
      onClick={(event) => event.stopPropagation()}
      className="inline-flex justify-end"
      role="presentation"
    >
      <Dropdown align="right" trigger={<KebabTrigger />} className="min-w-[160px]">
        {onEdit ? <DropdownItem onSelect={onEdit}>Edit</DropdownItem> : null}
        {onEdit && onDelete ? <DropdownDivider /> : null}
        {onDelete ? (
          <DropdownItem danger onSelect={onDelete}>
            {deleteLabel}
          </DropdownItem>
        ) : null}
      </Dropdown>
    </span>
  )
}
