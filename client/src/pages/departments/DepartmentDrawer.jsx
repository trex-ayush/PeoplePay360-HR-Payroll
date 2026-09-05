import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button, Drawer, FormField, Input, ReadOnlyField } from '@/components/ui'
import { departmentsApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'

const EMPTY = { name: '', code: '' }

export function DepartmentDrawer({ department, onClose, onSaved }) {
  const isNew = !department
  const notify = useNotify()

  const [form, setForm] = useState(
    isNew ? EMPTY : { name: department.name, code: department.code ?? '' }
  )
  const [editing, setEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)

    const payload = { name: form.name.trim(), code: form.code.trim() }

    try {
      if (isNew) {
        const { department } = await departmentsApi.create(payload)
        notify.success(`${department.name} created`)
      } else {
        await departmentsApi.update(department._id, payload)
        notify.success('Changes saved')
        setEditing(false)
      }
      onSaved()
    } catch (err) {
      notify.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      size="sm"
      title={isNew ? 'New department' : form.name || 'Department'}
      description="Departments group employees and split payroll cost. Renaming one does not affect anybody already assigned."
      footer={
        editing ? (
          <>
            <Button variant="secondary" onClick={isNew ? onClose : () => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" form="department-form" loading={saving}>
              {isNew ? 'Create department' : 'Save changes'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button iconLeft={<Pencil size={14} />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        )
      }
    >
      {editing ? (
        <form id="department-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Department Name" htmlFor="name" required>
            <Input
              id="name"
              autoFocus
              placeholder="Engineering"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FormField>

          <FormField label="Code" htmlFor="code" hint="Optional short form used in reports">
            <Input
              id="code"
              placeholder="ENG"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
          </FormField>
        </form>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <ReadOnlyField label="Department Name">{form.name}</ReadOnlyField>
          <ReadOnlyField label="Code">
            <span className="font-mono">{form.code || '—'}</span>
          </ReadOnlyField>
        </div>
      )}
    </Drawer>
  )
}
