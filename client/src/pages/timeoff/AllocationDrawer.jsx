import { useEffect, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import {
  Badge,
  Button,
  Drawer,
  ErrorState,
  FormField,
  Input,
  ReadOnlyField,
  Skeleton,
} from '@/components/ui'
import { allocationsApi, employeesApi, timeOffTypesApi } from '@/api/hr'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'
import { ALLOCATION_MODES, ALLOCATION_STATES } from '@/config/constants'

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

const EMPTY = {
  employee: '',
  type: '',
  mode: 'fixed',
  allocated: 0,
  accrualRate: 0,
  validFrom: '',
  validTo: '',
  description: '',
}

function Select({ label, htmlFor, required, hint, children, ...rest }) {
  return (
    <FormField label={label} htmlFor={htmlFor} required={required} hint={hint}>
      <select
        id={htmlFor}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
        {...rest}
      >
        {children}
      </select>
    </FormField>
  )
}

function BalanceTile({ label, value, unit, strong }) {
  return (
    <div className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700">
      <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-0.5 tabular-nums ${strong ? 'text-lg font-semibold' : 'font-medium'}`}>
        {value} <span className="text-xs font-normal text-neutral-500">{unit}</span>
      </p>
    </div>
  )
}

export function AllocationDrawer({ allocationId, onClose, onSaved }) {
  const isNew = allocationId === 'new'
  const notify = useNotify()

  const [form, setForm] = useState(EMPTY)
  const [record, setRecord] = useState(null)
  const [options, setOptions] = useState({ employees: [], types: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editing, setEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [{ employees }, { types }] = await Promise.all([
          employeesApi.list(),
          timeOffTypesApi.list(),
        ])
        if (cancelled) return
        setOptions({ employees, types })

        if (!isNew) {
          const { allocation } = await allocationsApi.get(allocationId)
          if (cancelled) return
          setRecord(allocation)
          setForm({
            ...EMPTY,
            ...allocation,
            employee: allocation.employee?._id ?? '',
            type: allocation.type?._id ?? '',
            validFrom: toDateInput(allocation.validFrom),
            validTo: toDateInput(allocation.validTo),
          })
        }
        setLoadError(null)
      } catch (err) {
        if (!cancelled) setLoadError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [allocationId, isNew])

  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        allocated: Number(form.allocated),
        accrualRate: form.mode === 'accrual' ? Number(form.accrualRate) : 0,
      }

      if (isNew) {
        await allocationsApi.create(payload)
        notify.success('Allocation created')
      } else {
        await allocationsApi.update(allocationId, payload)
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

  async function decide(action, verb) {
    try {
      await allocationsApi[action](allocationId)
      notify.success(`Allocation ${verb}`)
      onSaved()
      onClose()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  const unit = record?.type?.unit ?? 'days'
  const meta = ALLOCATION_STATES.find((s) => s.value === record?.state)

  return (
    <Drawer
      isOpen
      onClose={onClose}
      size="md"
      title={isNew ? 'New allocation' : `${record?.employee?.name ?? 'Allocation'}`}
      description="An approved allocation is what creates available leave balance."
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
            <Button key="save" type="submit" form="allocation-form" loading={saving}>
              {isNew ? 'Create allocation' : 'Save changes'}
            </Button>
          </>
        ) : record?.state === 'draft' ? (
          <>
            <Button
              key="refuse"
              variant="secondary"
              iconLeft={<X size={14} />}
              onClick={() => decide('refuse', 'refused')}
            >
              Refuse
            </Button>
            <Button
              key="approve"
              iconLeft={<Check size={14} />}
              onClick={() => decide('approve', 'approved')}
            >
              Approve
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
          <Skeleton height={80} />
        </div>
      ) : loadError ? (
        <ErrorState description={getErrorMessage(loadError)} />
      ) : !editing && record ? (
        <div className="space-y-5">
          <Badge tone={meta?.tone ?? 'neutral'} dot={record.state === 'approved'}>
            {meta?.label ?? record.state}
          </Badge>

          <div className="grid grid-cols-3 gap-3">
            <BalanceTile
              label={record.mode === 'accrual' ? 'Accrued' : 'Allocated'}
              value={record.accrued}
              unit={unit}
            />
            <BalanceTile label="Taken" value={record.taken} unit={unit} />
            <BalanceTile label="Remaining" value={record.remaining} unit={unit} strong />
          </div>

          {record.mode === 'accrual' ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Earns {record.accrualRate} {unit} at the end of every month, up to{' '}
              {record.allocated} {unit}.
            </p>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <ReadOnlyField label="Employee">{record.employee?.name}</ReadOnlyField>
            <ReadOnlyField label="Time Off Type">{record.type?.name}</ReadOnlyField>
            <ReadOnlyField label="Validity">
              {new Date(record.validFrom).toLocaleDateString('en-IN', { dateStyle: 'medium' })} —{' '}
              {new Date(record.validTo).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </ReadOnlyField>
            <ReadOnlyField label="Approver">{record.approver?.name ?? '—'}</ReadOnlyField>
            <div className="sm:col-span-2">
              <ReadOnlyField label="Description">{record.description}</ReadOnlyField>
            </div>
          </div>
        </div>
      ) : (
        <form id="allocation-form" onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Employee"
            htmlFor="employee"
            required
            value={form.employee}
            onChange={set('employee')}
          >
            <option value="">Select employee</option>
            {options.employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} · {e.code}
              </option>
            ))}
          </Select>

          <Select
            label="Time Off Type"
            htmlFor="type"
            required
            value={form.type}
            onChange={set('type')}
          >
            <option value="">Select type</option>
            {options.types.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </Select>

          <Select
            label="Mode"
            htmlFor="mode"
            required
            hint={
              form.mode === 'accrual'
                ? 'Balance builds up month by month'
                : 'The whole balance is available from day one'
            }
            value={form.mode}
            onChange={set('mode')}
          >
            {ALLOCATION_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label={form.mode === 'accrual' ? 'Yearly maximum' : 'Allocated'}
              htmlFor="allocated"
              required
              hint={
                form.mode === 'accrual'
                  ? 'Accrual stops here'
                  : 'Measured in the unit of the chosen type'
              }
            >
              <Input
                id="allocated"
                type="number"
                min="0"
                step="0.5"
                value={form.allocated}
                onChange={set('allocated')}
                required
              />
            </FormField>

            {form.mode === 'accrual' ? (
              <FormField
                label="Rate per month"
                htmlFor="accrualRate"
                required
                hint="Earned at the end of each month"
              >
                <Input
                  id="accrualRate"
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.accrualRate}
                  onChange={set('accrualRate')}
                  required
                />
              </FormField>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Valid From" htmlFor="validFrom" required>
              <Input
                id="validFrom"
                type="date"
                value={form.validFrom}
                onChange={set('validFrom')}
                required
              />
            </FormField>
            <FormField label="Valid To" htmlFor="validTo" required>
              <Input
                id="validTo"
                type="date"
                value={form.validTo}
                onChange={set('validTo')}
                required
              />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="description">
            <Input
              id="description"
              placeholder="Annual leave balance granted at start of policy year."
              value={form.description}
              onChange={set('description')}
            />
          </FormField>
        </form>
      )}
    </Drawer>
  )
}
