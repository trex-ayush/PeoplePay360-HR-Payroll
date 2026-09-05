import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AttendanceWidget } from '@/components/AttendanceWidget'
import { Badge, Card, CardBody, CardHeader, ErrorState, Input, Skeleton } from '@/components/ui'
import { dashboardApi, departmentsApi } from '@/api/hr'
import { useAuth } from '@/context/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'
import { ATTENDANCE_STATUSES, EMPLOYEE_TYPES } from '@/config/constants'
import { cn } from '@/utils/cn'

const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(value ?? 0)

// Indian payroll reads in lakhs and crores, not millions.
const compact = (value) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`
  return `₹${value ?? 0}`
}

const monthLabel = (key) => {
  const [year, index] = key.split('-').map(Number)
  return new Date(year, index - 1, 1).toLocaleDateString('en-IN', { month: 'short' })
}

// Local YYYY-MM-DD; toISOString would shift the day for anyone behind UTC.
const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const shiftDays = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

// Weeks start on Monday here, the same as working schedules do.
const startOfWeek = () => {
  const date = new Date()
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date
}

const PRESETS = [
  { key: 'today', label: 'Today', range: () => [new Date(), new Date()] },
  { key: 'yesterday', label: 'Yesterday', range: () => [shiftDays(-1), shiftDays(-1)] },
  { key: 'week', label: 'This week', range: () => [startOfWeek(), new Date()] },
  {
    key: 'month',
    label: 'This month',
    range: () => {
      const now = new Date()
      return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0)]
    },
  },
  {
    key: 'year',
    label: 'This year',
    range: () => {
      const year = new Date().getFullYear()
      return [new Date(year, 0, 1), new Date(year, 11, 31)]
    },
  },
  { key: 'custom', label: 'Custom' },
]

const rangeOf = (key) => {
  const [from, to] = PRESETS.find((p) => p.key === key).range()
  return { from: iso(from), to: iso(to) }
}

const readable = (from, to) => {
  const opts = { day: 'numeric', month: 'short', year: 'numeric' }
  const start = new Date(from).toLocaleDateString('en-IN', opts)
  return from === to ? start : `${start} — ${new Date(to).toLocaleDateString('en-IN', opts)}`
}

function Kpi({ label, value, hint }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs uppercase tracking-wider text-neutral-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
          {value}
        </p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      </CardBody>
    </Card>
  )
}

function Bars({ rows, max, format }) {
  if (!rows.length) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">Nothing in this period.</p>
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{row.label}</span>
            <span className="flex-shrink-0 tabular-nums text-neutral-600 dark:text-neutral-300">
              {format(row.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
            <div
              className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100"
              style={{ width: `${max ? (row.value / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function Select({ label, value, onChange, children }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">{label}</p>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
      >
        {children}
      </select>
    </div>
  )
}

export default function Dashboard() {
  usePageTitle('Home')
  const { user } = useAuth()

  const isHr = user.roles.some((role) => HR_ROLES.includes(role))

  const [preset, setPreset] = useState('month')
  const [filters, setFilters] = useState({ ...rangeOf('month'), department: '', employeeType: '' })
  const [departments, setDepartments] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(isHr)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isHr) return
    departmentsApi
      .list()
      .then(({ departments }) => setDepartments(departments))
      .catch(() => setDepartments([]))
  }, [isHr])

  useEffect(() => {
    if (!isHr) return

    let cancelled = false
    setLoading(true)

    dashboardApi
      .summary(filters)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [filters, isHr])

  const set = (field) => (event) =>
    setFilters((current) => ({ ...current, [field]: event.target.value }))

  return (
    <PageContainer>
      <PageHeader
        title="Payroll Dashboard"
        description="Live across employees, contracts, attendance, time off and payroll."
      />

      <div className="mb-6">
        <AttendanceWidget />
      </div>

      {!isHr ? null : loading && !data ? (
        <div className="space-y-4">
          <Skeleton height={80} />
          <Skeleton height={140} />
          <Skeleton height={200} />
        </div>
      ) : error ? (
        <ErrorState description={getErrorMessage(error)} />
      ) : data ? (
        <>
          <Card className="mb-6">
            <CardBody>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {PRESETS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setPreset(option.key)
                      if (option.range) setFilters((f) => ({ ...f, ...rangeOf(option.key) }))
                    }}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                      preset === option.key
                        ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                        : 'border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-300'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
                <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
                  {readable(filters.from, filters.to)}
                </span>
              </div>

              {preset === 'custom' ? (
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      From
                    </p>
                    <Input type="date" value={filters.from} max={filters.to} onChange={set('from')} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      To
                    </p>
                    <Input type="date" value={filters.to} min={filters.from} onChange={set('to')} />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Department" value={filters.department} onChange={set('department')}>
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Employee Type"
                value={filters.employeeType}
                onChange={set('employeeType')}
              >
                <option value="">All types</option>
                {EMPLOYEE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              </div>
            </CardBody>
          </Card>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi
              label="Total Net Salary Paid"
              value={compact(data.kpis.netPaid)}
              hint={
                data.kpis.netChange === null
                  ? 'Nothing paid in the period before'
                  : `${data.kpis.netChange > 0 ? '+' : ''}${data.kpis.netChange}% vs previous period`
              }
            />
            <Kpi
              label="Payslips Generated"
              value={data.kpis.payslips}
              hint={`${data.kpis.payslipsPaid} paid, ${data.payslipStatus.done} awaiting payment`}
            />
            <Kpi
              label="Avg Salary / Employee"
              value={money(data.kpis.avgSalary)}
              hint="Across this period's payslips"
            />
            <Kpi
              label="Approved Time Off"
              value={`${data.kpis.approvedTimeOffDays} days`}
              hint="Across selected period"
            />
            <Kpi
              label="Attendance Health"
              value={data.kpis.attendanceHealth === null ? '—' : `${data.kpis.attendanceHealth}%`}
              hint={
                data.kpis.attendanceHealth === null
                  ? 'No attendance recorded yet'
                  : 'Present of reviewed records'
              }
            />
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Attendance Overview</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Across the selected period
                </p>
              </CardHeader>
              <CardBody className="flex flex-wrap gap-4">
                {ATTENDANCE_STATUSES.map((status) => (
                  <div key={status.value} className="min-w-[70px]">
                    <p className="text-2xl font-semibold tabular-nums">
                      {data.attendance[status.value]}
                    </p>
                    <Badge tone={status.tone} size="sm">
                      {status.label}
                    </Badge>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">Alerts</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Waiting right now, whatever period is selected
                </p>
              </CardHeader>
              <CardBody className="space-y-2 text-sm">
                <Link
                  to="/time-off/requests"
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/40"
                >
                  <span>Time off requests waiting for approval</span>
                  <span className="font-semibold tabular-nums">{data.alerts.pendingTimeOff}</span>
                </Link>
                <Link
                  to="/contracts"
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/40"
                >
                  <span>Contracts ending in the next 30 days</span>
                  <span className="font-semibold tabular-nums">{data.alerts.contractsExpiring}</span>
                </Link>
                <Link
                  to="/employees"
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/40"
                >
                  <span>Employees with no bank account</span>
                  <span className="font-semibold tabular-nums">
                    {data.alerts.employeesWithoutBankAccount}
                  </span>
                </Link>
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Monthly Net Salary Trend</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Paid payslips over the last six months
                </p>
              </CardHeader>
              <CardBody>
                <Bars
                  rows={data.trend.map((t) => ({ label: monthLabel(t.month), value: t.net }))}
                  max={Math.max(...data.trend.map((t) => t.net), 1)}
                  format={compact}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">Department Overview</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Headcount and salary cost
                </p>
              </CardHeader>
              <CardBody>
                <Bars
                  rows={data.byDepartment.map((d) => ({
                    label: `${d.department} · ${d.headcount}`,
                    value: d.salary,
                  }))}
                  max={Math.max(...data.byDepartment.map((d) => d.salary), 1)}
                  format={compact}
                />
              </CardBody>
            </Card>
          </div>

        </>
      ) : null}
    </PageContainer>
  )
}
