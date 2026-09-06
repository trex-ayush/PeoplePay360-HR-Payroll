import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Skeleton,
} from '@/components/ui'
import { attendanceApi, contractsApi, departmentsApi, employeesApi, schedulesApi } from '@/api/hr'
import { AccessTab, InviteLink, RolePicker } from './AccessTab'
import { AllocationsTab, TimeOffTab } from './TimeOffTabs'
import { useNotify } from '@/context/NotificationContext'
import { employeeSchema } from '@/validations/employee'
import { getErrorMessage } from '@/utils/errorUtils'
import {
  ATTENDANCE_STATUSES,
  CONTRACT_STATES,
  EMPLOYEE_TYPES,
  MAX_PAGE_SIZE,
} from '@/config/constants'
import { cn } from '@/utils/cn'

const EMPTY = {
  code: '',
  name: '',
  workEmail: '',
  phone: '',
  department: '',
  manager: '',
  schedule: '',
  jobPosition: '',
  workLocation: '',
  employeeType: 'full_time',
  bankAccount: '',
  active: true,
}

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'

const withCount = (label, count) => (count ? `${label} (${count})` : label)

const formatClock = (value) =>
  value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'

const formatWage = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value ?? 0)

function Select({ label, htmlFor, required, error, children, ...rest }) {
  return (
    <FormField label={label} htmlFor={htmlFor} required={required} error={error}>
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

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="-mx-6 mb-5 flex gap-6 border-b border-neutral-200 px-6 dark:border-neutral-700">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            '-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors',
            active === tab.key
              ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function AttendanceTab({ employeeId }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    attendanceApi
      .list({ employee: employeeId })
      .then(({ records }) => !cancelled && setRecords(records))
      .catch(() => !cancelled && setRecords([]))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [employeeId])

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={56} rounded="lg" />
        ))}
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <EmptyState
        compact
        title="Nothing recorded yet"
        description="Days appear here once they check in from the home page, or HR adds a record."
      />
    )
  }

  return (
    <div className="space-y-2">
      {records.slice(0, 10).map((record) => {
        const meta = ATTENDANCE_STATUSES.find((s) => s.value === record.status)

        return (
          <div
            key={record._id}
            className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-700"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{formatDate(record.date)}</p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {formatClock(record.checkIn)} — {formatClock(record.checkOut)}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <span className="text-sm tabular-nums">
                {record.workedHours}h
                {record.overtimeHours ? (
                  <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">
                    +{record.overtimeHours}
                  </span>
                ) : record.shortHours ? (
                  <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                    -{record.shortHours}
                  </span>
                ) : null}
              </span>
              <Badge tone={meta?.tone ?? 'neutral'} size="sm">
                {meta?.label ?? record.status}
              </Badge>
            </div>
          </div>
        )
      })}

      <Link
        to={`/attendance?employee=${employeeId}`}
        className="inline-block pt-1 text-sm text-neutral-500 hover:underline dark:text-neutral-400"
      >
        View all in Attendance
      </Link>
    </div>
  )
}

function ContractsTab({ employeeId, contracts, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={62} rounded="lg" />
        ))}
      </div>
    )
  }

  if (contracts.length === 0) {
    return (
      <EmptyState
        compact
        title="No contracts yet"
        description="Wage, schedule and salary structure live on the contract."
        action={
          <Link to={`/contracts/new?employee=${employeeId}`}>
            <Button iconLeft={<Plus size={16} />}>New contract</Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-2">
      {contracts.map((contract) => {
        const meta = CONTRACT_STATES.find((s) => s.value === contract.state)

        return (
          <Link
            key={contract._id}
            to={`/contracts/${contract._id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs font-medium">{contract.reference}</p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {formatDate(contract.startDate)} →{' '}
                {contract.endDate ? formatDate(contract.endDate) : 'open ended'}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <span className="text-sm tabular-nums">{formatWage(contract.wage)}</span>
              <Badge tone={meta?.tone ?? 'neutral'} size="sm" dot={contract.state === 'running'}>
                {meta?.label ?? contract.state}
              </Badge>
            </div>
          </Link>
        )
      })}

      <Link
        to={`/contracts?employee=${employeeId}`}
        className="inline-block pt-1 text-sm text-neutral-500 hover:underline dark:text-neutral-400"
      >
        View all in Contracts
      </Link>
    </div>
  )
}

export function EmployeeDrawer({ employeeId, onClose, onSaved }) {
  const isNew = employeeId === 'new'
  const notify = useNotify()

  const [tab, setTab] = useState('details')
  const [options, setOptions] = useState({ departments: [], schedules: [], employees: [] })
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [counts, setCounts] = useState(null)
  const [newRoles, setNewRoles] = useState([])
  const [invite, setInvite] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(employeeSchema), defaultValues: EMPTY })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [{ departments }, { schedules }, { employees }] = await Promise.all([
          departmentsApi.list(),
          schedulesApi.list(),
          employeesApi.list({ pageSize: MAX_PAGE_SIZE }),
        ])
        if (cancelled) return
        setOptions({ departments, schedules, employees })

        if (isNew) {
          const { code } = await employeesApi.nextCode()
          if (cancelled) return
          reset({ ...EMPTY, code })
        } else {
          const [{ employee }, { contracts }, related] = await Promise.all([
            employeesApi.get(employeeId),
            contractsApi.list({ employee: employeeId, pageSize: MAX_PAGE_SIZE }),
            employeesApi.related(employeeId),
          ])
          if (cancelled) return
          setContracts(contracts)
          setCounts(related)
          reset({
            ...EMPTY,
            ...employee,
            department: employee.department?._id ?? '',
            manager: employee.manager?._id ?? '',
            schedule: employee.schedule?._id ?? '',
            active: employee.active,
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
  }, [employeeId, isNew, reset])

  const onSubmit = handleSubmit(async (data) => {
    const payload = {
      ...data,
      manager: data.manager || null,
      department: data.department || undefined,
      schedule: data.schedule || undefined,
    }

    try {
      if (isNew) {
        const { employee, invite } = await employeesApi.create({ ...payload, roles: newRoles })
        notify.success(`${employee.name} created`)
        // The link has to be readable before the drawer goes away.
        if (invite) {
          setInvite(invite)
          onSaved({ keepOpen: true })
          return
        }
      } else {
        await employeesApi.update(employeeId, payload)
        notify.success('Changes saved')
      }
      onSaved()
    } catch (err) {
      notify.error(getErrorMessage(err))
    }
  })

  const name = watch('name')
  const isActive = String(watch('active')) !== 'false'

  const tabs = [
    { key: 'details', label: 'Details' },
    ...(isNew
      ? []
      : [
          { key: 'contracts', label: withCount('Contracts', counts?.contracts) },
          { key: 'attendance', label: withCount('Attendance', counts?.attendance) },
          { key: 'timeoff', label: withCount('Time Off', counts?.timeOff) },
          { key: 'allocations', label: withCount('Allocations', counts?.allocations) },
          { key: 'access', label: 'Login Access' },
        ]),
  ]

  return (
    <Drawer
      isOpen
      onClose={onClose}
      size="lg"
      title={isNew ? 'New employee' : name || 'Employee'}
      description={isNew ? 'Create an employee record.' : 'HR details, contracts and attendance.'}
      footer={
        invite ? (
          <Button onClick={onClose}>Done</Button>
        ) : tab === 'details' ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="employee-form" loading={isSubmitting} disabled={loading}>
              {isNew ? 'Create employee' : 'Save changes'}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      {loadError ? (
        <ErrorState description={loadError.message} />
      ) : (
        <>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />

          {invite ? (
            <div className="space-y-4">
              <p className="text-sm">
                Employee created. Send them this link so they can set a password.
              </p>
              <InviteLink invite={invite} onResend={() => {}} />
            </div>
          ) : tab === 'details' ? (
            loading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} height={62} rounded="lg" />
                ))}
              </div>
            ) : (
              <form id="employee-form" onSubmit={onSubmit}>
                {!isNew ? (
                  <div className="mb-4">
                    {isActive ? (
                      <Badge tone="success" dot>
                        Active
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Archived</Badge>
                    )}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Employee Code"
                    htmlFor="code"
                    error={errors.code?.message}
                    required
                    hint={isNew ? 'Suggested next code — change it if you need to' : undefined}
                  >
                    <Input id="code" {...register('code')} />
                  </FormField>

                  <FormField label="Name" htmlFor="name" required error={errors.name?.message}>
                    <Input id="name" {...register('name')} />
                  </FormField>

                  <FormField
                    label="Work Email"
                    htmlFor="workEmail"
                    required
                    error={errors.workEmail?.message}
                  >
                    <Input id="workEmail" type="email" {...register('workEmail')} />
                  </FormField>

                  <FormField label="Phone" htmlFor="phone" error={errors.phone?.message}>
                    <Input id="phone" {...register('phone')} />
                  </FormField>

                  <Select
                    label="Department"
                    htmlFor="department"
                    required
                    error={errors.department?.message}
                    {...register('department')}
                  >
                    <option value="">Select department</option>
                    {options.departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>

                  <Select label="Manager" htmlFor="manager" {...register('manager')}>
                    <option value="">No manager</option>
                    {options.employees
                      .filter((e) => e._id !== employeeId)
                      .map((e) => (
                        <option key={e._id} value={e._id}>
                          {e.name}
                        </option>
                      ))}
                  </Select>

                  <Select
                    label="Working Schedule"
                    htmlFor="schedule"
                    required
                    error={errors.schedule?.message}
                    {...register('schedule')}
                  >
                    <option value="">Select schedule</option>
                    {options.schedules.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} · {s.weeklyHours} h/week
                      </option>
                    ))}
                  </Select>

                  <FormField label="Job Position" htmlFor="jobPosition">
                    <Input id="jobPosition" {...register('jobPosition')} />
                  </FormField>

                  <FormField label="Work Location" htmlFor="workLocation">
                    <Input id="workLocation" placeholder="Mumbai" {...register('workLocation')} />
                  </FormField>

                  <Select label="Employee Type" htmlFor="employeeType" {...register('employeeType')}>
                    {EMPLOYEE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>

                  <FormField
                    label="Bank Account"
                    htmlFor="bankAccount"
                    hint="Payroll warns when this is missing"
                  >
                    <Input id="bankAccount" {...register('bankAccount')} />
                  </FormField>

                  <Select label="Status" htmlFor="active" {...register('active')}>
                    <option value="true">Active</option>
                    <option value="false">Archived</option>
                  </Select>
                </div>

                {isNew ? (
                  <div className="mt-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
                    <p className="text-sm font-medium">Login access</p>
                    <p className="mb-3 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      Pick roles to create an account too. They get a link to set their own
                      password — leave this empty for someone who does not sign in.
                    </p>
                    <RolePicker roles={newRoles} onChange={setNewRoles} />
                  </div>
                ) : null}
              </form>
            )
          ) : null}

          {tab === 'contracts' ? (
            <ContractsTab employeeId={employeeId} contracts={contracts} loading={loading} />
          ) : null}

          {tab === 'timeoff' ? <TimeOffTab employeeId={employeeId} /> : null}

          {tab === 'allocations' ? <AllocationsTab employeeId={employeeId} /> : null}

          {tab === 'access' ? <AccessTab employeeId={employeeId} /> : null}

          {tab === 'attendance' ? <AttendanceTab employeeId={employeeId} /> : null}
        </>
      )}
    </Drawer>
  )
}
