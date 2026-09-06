import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Pencil, X } from 'lucide-react'
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
import { allocationsApi, employeesApi, timeOffRequestsApi, timeOffTypesApi } from '@/api/hr'
import { useAuth } from '@/context/AuthContext'
import { useNotify } from '@/context/NotificationContext'
import { getErrorMessage } from '@/utils/errorUtils'
import { MAX_PAGE_SIZE, REQUEST_STATES } from '@/config/constants'
import { inUnits } from '@/utils/units'

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

const longDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })

const round2 = (n) => Math.round(n * 100) / 100

const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']

const EMPTY = { employee: '', type: '', dateFrom: '', dateTo: '', reason: '' }

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

export function RequestDrawer({ requestId, onClose, onSaved }) {
  const isNew = requestId === 'new'
  const notify = useNotify()
  const { user } = useAuth()

  const canDecide = user.roles.some((role) => HR_ROLES.includes(role))

  const [form, setForm] = useState(EMPTY)
  const [record, setRecord] = useState(null)
  const [balance, setBalance] = useState(null)
  const [options, setOptions] = useState({ employees: [], types: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [editing, setEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)
  const [quota, setQuota] = useState(null)
  const [paidDays, setPaidDays] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // An employee cannot read the staff list, and does not need it: their own
        // request is always for themselves.
        const [{ types }, staff] = await Promise.all([
          timeOffTypesApi.list(),
          canDecide ? employeesApi.list({ pageSize: MAX_PAGE_SIZE }) : Promise.resolve({ employees: [] }),
        ])
        if (cancelled) return
        setOptions({ employees: staff.employees, types })
        if (isNew && !canDecide) setForm((f) => ({ ...f, employee: user.employeeId ?? '' }))

        if (!isNew) {
          const { request, balance } = await timeOffRequestsApi.get(requestId)
          if (cancelled) return
          setRecord(request)
          setBalance(balance)
          setPaidDays(balance ? Math.min(request.duration, Math.max(0, balance.remaining)) : null)
          setForm({
            ...EMPTY,
            ...request,
            employee: request.employee?._id ?? '',
            type: request.type?._id ?? '',
            dateFrom: toDateInput(request.dateFrom),
            dateTo: toDateInput(request.dateTo),
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
  }, [requestId, isNew, canDecide, user.employeeId])

  // What they have left, looked up as soon as there is an employee and a type —
  // nobody should have to guess before picking dates.
  useEffect(() => {
    if (!form.employee || !form.type) return setQuota(null)

    let cancelled = false
    allocationsApi
      .list({ employee: form.employee, type: form.type, state: 'approved' })
      .then(({ allocations }) => !cancelled && setQuota(allocations[0] ?? null))
      .catch(() => !cancelled && setQuota(null))

    return () => {
      cancelled = true
    }
  }, [form.employee, form.type])

  const set = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      if (isNew) {
        await timeOffRequestsApi.create(form)
        notify.success('Request submitted')
      } else {
        await timeOffRequestsApi.update(requestId, form)
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
      const body = action === 'approve' && paidDays !== null ? { paidDuration: paidDays } : undefined
      const { request } = await timeOffRequestsApi[action](requestId, body)

      notify.success(
        request.unpaidDuration
          ? `Approved · ${request.paidDuration} paid, ${request.unpaidDuration} unpaid`
          : `Request ${verb}`
      )
      onSaved()
      onClose()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  }

  const meta = REQUEST_STATES.find((s) => s.value === record?.state)
  const unit = record?.type?.unit ?? 'days'
  const shortfall = balance && record ? round2(record.duration - balance.remaining) : 0

  return (
    <Drawer
      isOpen
      onClose={onClose}
      size="md"
      title={isNew ? 'New time off request' : record?.employee?.name ?? 'Time off request'}
      description="Approving a request is what consumes the employee’s balance."
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
            <Button key="save" type="submit" form="request-form" loading={saving}>
              {isNew ? 'Submit request' : 'Save changes'}
            </Button>
          </>
        ) : canDecide && record?.state === 'draft' ? (
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
            <Button
              key="reopen"
              variant="secondary"
              iconLeft={<X size={14} />}
              onClick={() => decide('refuse', 'refused')}
              disabled={record?.state === 'refused'}
            >
              Refuse
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

          <div className="grid gap-5 sm:grid-cols-2">
            <ReadOnlyField label="Employee">{record.employee?.name}</ReadOnlyField>
            <ReadOnlyField label="Time Off Type">{record.type?.name}</ReadOnlyField>
            <ReadOnlyField label="Start Date">{longDate(record.dateFrom)}</ReadOnlyField>
            <ReadOnlyField label="End Date">{longDate(record.dateTo)}</ReadOnlyField>
            <ReadOnlyField label="Duration">
              <span className="tabular-nums">{inUnits(record.duration, unit)}</span>
            </ReadOnlyField>
            <ReadOnlyField label="Approver">{record.approver?.name ?? '—'}</ReadOnlyField>
            <div className="sm:col-span-2">
              <ReadOnlyField label="Reason">{record.reason}</ReadOnlyField>
            </div>
          </div>

          {record.type?.requiresAllocation ? (
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
              <p className="text-xs uppercase tracking-wider text-neutral-500">Allocation Used</p>
              {balance ? (
                <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
                  <span>
                    Accrued <span className="font-medium tabular-nums">{balance.accrued}</span>
                  </span>
                  <span>
                    Taken <span className="font-medium tabular-nums">{balance.taken}</span>
                  </span>
                  <span>
                    Remaining{' '}
                    <span className="font-semibold tabular-nums">{balance.remaining}</span> {unit}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  No approved allocation covers these dates, so this request cannot be approved.
                </p>
              )}
            </div>
          ) : null}

          {shortfall > 0 ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangle size={15} />
                {record.employee?.name} has {balance.remaining} {unit} left but asked for{' '}
                {record.duration}
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Choose how much comes out of the balance. The remaining {shortfall} {unit} are
                approved as leave without pay, and payroll deducts them.
              </p>

              {record.state === 'draft' ? (
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="w-32">
                    <FormField label={`Paid from balance`} htmlFor="paidDays">
                      <Input
                        id="paidDays"
                        type="number"
                        min="0"
                        max={balance.remaining}
                        step="0.5"
                        value={paidDays ?? 0}
                        onChange={(e) => setPaidDays(Number(e.target.value))}
                      />
                    </FormField>
                  </div>
                  <p className="pb-2 text-xs text-amber-700 dark:text-amber-400">
                    {paidDays ?? 0} paid · {round2(record.duration - (paidDays ?? 0))} unpaid
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {record.state === 'approved' && record.unpaidDuration ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {record.paidDuration} {unit} paid from the allocation, {record.unpaidDuration} taken
              without pay.
            </p>
          ) : null}
        </div>
      ) : (
        <form id="request-form" onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Employee"
            htmlFor="employee"
            required
            hint={canDecide ? undefined : 'You can only raise leave for yourself'}
            value={form.employee}
            onChange={set('employee')}
            disabled={!canDecide}
          >
            {canDecide ? (
              <>
                <option value="">Select employee</option>
                {options.employees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name} · {e.code}
                  </option>
                ))}
              </>
            ) : (
              <option value={user.employeeId ?? ''}>{user.name}</option>
            )}
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

          {quota ? (
            <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
                <span className="text-xs uppercase tracking-wider text-neutral-500">
                  {quota.type?.name}
                </span>
                <span>
                  Accrued <span className="font-medium tabular-nums">{quota.accrued}</span>
                </span>
                <span>
                  Taken <span className="font-medium tabular-nums">{quota.taken}</span>
                </span>
                {quota.pending ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    Awaiting approval{' '}
                    <span className="font-medium tabular-nums">{quota.pending}</span>
                  </span>
                ) : null}
                <span className="ml-auto">
                  Available{' '}
                  <span className="text-base font-semibold tabular-nums">{quota.available}</span>{' '}
                  {quota.type?.unit}
                </span>
              </div>
            </div>
          ) : form.type && options.types.find((t) => t._id === form.type)?.requiresAllocation ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              No approved allocation covers this leave type, so a request cannot be approved yet.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Start Date"
              htmlFor="dateFrom"
              required
              hint="Duration skips rest days"
            >
              <Input
                id="dateFrom"
                type="date"
                value={form.dateFrom}
                max={form.dateTo || undefined}
                onChange={set('dateFrom')}
                required
              />
            </FormField>
            <FormField label="End Date" htmlFor="dateTo" required hint="Both dates are included">
              <Input
                id="dateTo"
                type="date"
                value={form.dateTo}
                min={form.dateFrom || undefined}
                onChange={set('dateTo')}
                required
              />
            </FormField>
          </div>

          <FormField label="Reason" htmlFor="reason">
            <Input
              id="reason"
              placeholder="Family vacation"
              value={form.reason}
              onChange={set('reason')}
            />
          </FormField>
        </form>
      )}
    </Drawer>
  )
}
