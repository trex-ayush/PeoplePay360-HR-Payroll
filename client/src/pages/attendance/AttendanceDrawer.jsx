import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
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
import { attendanceApi, employeesApi } from '@/api/hr'
import { useAuth } from '@/context/AuthContext'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'
import { ATTENDANCE_STATUSES } from '@/config/constants'

// datetime-local wants local time without a zone; toISOString would shift it.
const toLocalInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const stamp = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—'

const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']

const EMPTY = { employee: '', checkIn: '', checkOut: '', notes: '' }

export function AttendanceDrawer({ recordId, onClose, onSaved }) {
  const isNew = recordId === 'new'
  const notify = useNotify()
  const { user } = useAuth()

  // Only HR corrects records, and only HR can read the staff list.
  const canCorrect = user.roles.some((role) => HR_ROLES.includes(role))

  const [form, setForm] = useState(EMPTY)
  const [record, setRecord] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editing, setEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        if (canCorrect) {
          const { employees } = await employeesApi.list()
          if (!cancelled) setEmployees(employees)
        }
        if (cancelled) return

        if (!isNew) {
          const { record } = await attendanceApi.get(recordId)
          if (cancelled) return
          setRecord(record)
          setForm({
            employee: record.employee?._id ?? '',
            checkIn: toLocalInput(record.checkIn),
            checkOut: toLocalInput(record.checkOut),
            notes: record.notes ?? '',
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
  }, [recordId, isNew, canCorrect])

  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        checkIn: form.checkIn ? new Date(form.checkIn).toISOString() : null,
        checkOut: form.checkOut ? new Date(form.checkOut).toISOString() : null,
      }

      if (isNew) {
        await attendanceApi.create(payload)
        notify.success('Attendance recorded')
      } else {
        await attendanceApi.update(recordId, payload)
        notify.success('Correction saved')
        setEditing(false)
      }
      onSaved()
    } catch (err) {
      notify.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const meta = ATTENDANCE_STATUSES.find((s) => s.value === record?.status)

  return (
    <Drawer
      isOpen
      onClose={onClose}
      size="md"
      title={isNew ? 'New attendance record' : record?.employee?.name ?? 'Attendance'}
      description="Worked hours and status are derived from the employee's working schedule."
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
            <Button key="save" type="submit" form="attendance-form" loading={saving}>
              {isNew ? 'Create record' : 'Save correction'}
            </Button>
          </>
        ) : (
          <>
            <Button key="close" variant="secondary" onClick={onClose}>
              Close
            </Button>
            {canCorrect ? (
              <Button key="edit" iconLeft={<Pencil size={14} />} onClick={() => setEditing(true)}>
                Correct
              </Button>
            ) : null}
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
      ) : !editing && record ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta?.tone ?? 'neutral'}>{meta?.label ?? record.status}</Badge>
            {record.manuallyEdited ? (
              <Badge tone="neutral" size="sm">
                Manually corrected
              </Badge>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <ReadOnlyField label="Employee">{record.employee?.name}</ReadOnlyField>
            <ReadOnlyField label="Department">{record.employee?.department?.name}</ReadOnlyField>
            <ReadOnlyField label="Check In">{stamp(record.checkIn)}</ReadOnlyField>
            <ReadOnlyField label="Check Out">{stamp(record.checkOut)}</ReadOnlyField>
            <ReadOnlyField label="Worked Hours">
              <span className="tabular-nums">{record.workedHours}</span>
            </ReadOnlyField>
            <ReadOnlyField label={record.shortHours ? 'Short By' : 'Overtime'}>
              <span className="tabular-nums">
                {record.shortHours ? record.shortHours : record.overtimeHours} hrs
              </span>
            </ReadOnlyField>
            <div className="sm:col-span-2">
              <ReadOnlyField label="Notes">{record.notes}</ReadOnlyField>
            </div>
          </div>
        </div>
      ) : (
        <form id="attendance-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Employee" htmlFor="employee" required>
            <select
              id="employee"
              value={form.employee}
              onChange={set('employee')}
              disabled={!isNew}
              required
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name} · {e.code}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Check In" htmlFor="checkIn" hint="Leave empty to mark absent">
              <Input
                id="checkIn"
                type="datetime-local"
                value={form.checkIn}
                onChange={set('checkIn')}
              />
            </FormField>
            <FormField label="Check Out" htmlFor="checkOut" hint="Empty means still working">
              <Input
                id="checkOut"
                type="datetime-local"
                value={form.checkOut}
                onChange={set('checkOut')}
              />
            </FormField>
          </div>

          <FormField
            label="Notes"
            htmlFor="notes"
            hint="Why the record was corrected — useful when payroll queries it"
          >
            <Input
              id="notes"
              placeholder="Forgot to check out, confirmed with manager"
              value={form.notes}
              onChange={set('notes')}
            />
          </FormField>
        </form>
      )}
    </Drawer>
  )
}
