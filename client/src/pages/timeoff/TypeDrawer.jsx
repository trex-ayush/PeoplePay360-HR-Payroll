import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import {
  Badge,
  Button,
  Checkbox,
  Drawer,
  ErrorState,
  FormField,
  Input,
  ReadOnlyField,
  Skeleton,
} from '@/components/ui'
import { timeOffTypesApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'
import { TIMEOFF_UNITS } from '@/config/constants'

const EMPTY = {
  name: '',
  unit: 'days',
  requiresAllocation: true,
  payrollCode: '',
  active: true,
}

export function TypeDrawer({ typeId, onClose, onSaved }) {
  const isNew = typeId === 'new'
  const notify = useNotify()

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [loadError, setLoadError] = useState(null)
  const [editing, setEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew) {
      setForm(EMPTY)
      return
    }

    let cancelled = false
    timeOffTypesApi
      .get(typeId)
      .then(({ type }) => !cancelled && setForm({ ...EMPTY, ...type }))
      .catch((err) => !cancelled && setLoadError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [typeId, isNew])

  const set = (field) => (event) =>
    setForm((current) => ({
      ...current,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }))

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      if (isNew) {
        const { type } = await timeOffTypesApi.create(form)
        notify.success(`${type.name} created`)
      } else {
        await timeOffTypesApi.update(typeId, form)
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

  const unitLabel = TIMEOFF_UNITS.find((u) => u.value === form.unit)?.label

  return (
    <Drawer
      isOpen
      onClose={onClose}
      size="md"
      title={isNew ? 'New time off type' : form.name || 'Time off type'}
      description="A type is the leave policy: how it is measured, and whether it draws from a balance."
      footer={
        editing ? (
          <>
            <Button
              key="cancel"
              variant="secondary"
              onClick={isNew ? onClose : () => setEditing(false)}
            >
              Cancel
            </Button>
            <Button key="save" type="submit" form="type-form" loading={saving}>
              {isNew ? 'Create type' : 'Save changes'}
            </Button>
          </>
        ) : (
          <>
            <Button key="close" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button key="edit" iconLeft={<Pencil size={14} />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          </>
        )
      }
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton height={64} />
          <Skeleton height={64} />
        </div>
      ) : loadError ? (
        <ErrorState description={getErrorMessage(loadError)} />
      ) : !editing ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <ReadOnlyField label="Type Name">{form.name}</ReadOnlyField>
          <ReadOnlyField label="Unit">{unitLabel}</ReadOnlyField>
          <ReadOnlyField label="Requires Allocation">
            <Badge tone={form.requiresAllocation ? 'warning' : 'neutral'} size="sm">
              {form.requiresAllocation ? 'Required' : 'No'}
            </Badge>
          </ReadOnlyField>
          <ReadOnlyField label="Payroll Code">
            <span className="font-mono">{form.payrollCode || '—'}</span>
          </ReadOnlyField>
          <ReadOnlyField label="Status">
            <Badge tone={form.active ? 'success' : 'neutral'} size="sm" dot={form.active}>
              {form.active ? 'Active' : 'Inactive'}
            </Badge>
          </ReadOnlyField>
        </div>
      ) : (
        <form id="type-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Type Name" htmlFor="name" required>
            <Input
              id="name"
              placeholder="Paid Time Off"
              value={form.name}
              onChange={set('name')}
              required
            />
          </FormField>

          <FormField label="Unit" htmlFor="unit" required hint="How this leave is measured">
            <select
              id="unit"
              value={form.unit}
              onChange={set('unit')}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            >
              {TIMEOFF_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Payroll Code"
            htmlFor="payrollCode"
            hint="Optional — the salary rule code this leave feeds"
          >
            <Input
              id="payrollCode"
              placeholder="PTO"
              value={form.payrollCode}
              onChange={set('payrollCode')}
            />
          </FormField>

          <Checkbox
            label="Requires allocation"
            description="Leave of this type can only be approved against an approved balance."
            checked={form.requiresAllocation}
            onChange={set('requiresAllocation')}
          />

          <Checkbox
            label="Active"
            description="Inactive types stay on old records but cannot be chosen for new ones."
            checked={form.active}
            onChange={set('active')}
          />
        </form>
      )}
    </Drawer>
  )
}
