import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { AttendanceWidget } from '@/components/AttendanceWidget'
import { Card, CardBody, CardHeader, ErrorState, Input, Skeleton } from '@/components/ui'
import { dashboardApi, departmentsApi } from '@/api/hr'
import { useAuth } from '@/context/AuthContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getErrorMessage } from '@/utils/errorUtils'
import { ATTENDANCE_STATUSES, EMPLOYEE_TYPES } from '@/config/constants'
import { cn } from '@/utils/cn'
import { inUnits } from '@/utils/units'

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

const ATTENDANCE_COLORS = {
  present: '#10B981',
  late: '#F59E0B',
  overtime: '#3B82F6',
  absent: '#EF4444',
}

const EMPTY = (
  <p className="text-sm text-neutral-500 dark:text-neutral-400">
    No payroll has been paid in this period yet.
  </p>
)

// Axis and grid colours follow the theme class the same way the starter's charts do.
const isDark = () => document.documentElement.classList.contains('dark')
const axisColor = () => (isDark() ? '#9CA3AF' : '#6B7280')
const gridColor = () => (isDark() ? '#374151' : '#E5E7EB')

function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <p className="mb-1 font-medium text-neutral-900 dark:text-white">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-neutral-600 dark:text-neutral-400">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color ?? entry.payload?.fill }}
          />
          <span className="font-medium text-neutral-900 dark:text-white">
            {format ? format(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  )
}

function TrendChart({ rows, format }) {
  if (!rows.some((row) => row.value)) return EMPTY

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={rows} margin={{ top: 5, right: 5, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="netTrend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor()} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: axisColor() }}
          axisLine={{ stroke: gridColor() }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: axisColor() }}
          axisLine={false}
          tickLine={false}
          tickFormatter={format}
        />
        <Tooltip content={<ChartTooltip format={format} />} />
        <Area
          type="monotone"
          dataKey="value"
          name="Net paid"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="url(#netTrend)"
          dot={{ r: 3, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function DepartmentChart({ rows, format }) {
  if (!rows.some((row) => row.value)) return EMPTY

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 5, right: 5, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor()} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: axisColor() }}
          axisLine={{ stroke: gridColor() }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: axisColor() }}
          axisLine={false}
          tickLine={false}
          tickFormatter={format}
        />
        <Tooltip cursor={{ fill: gridColor(), opacity: 0.4 }} content={<ChartTooltip format={format} />} />
        <Bar dataKey="value" name="Salary cost" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function AttendanceDonut({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  if (!total) return EMPTY

  return (
    <div className="flex items-center gap-4">
      {/* ResponsiveContainer measures its parent, so the parent is what carries the size. */}
      <div className="h-[170px] w-1/2 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={2}
            >
              {rows.map((row) => (
                <Cell key={row.label} fill={row.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex-1 space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: row.color }}
            />
            <span className="flex-1 text-neutral-600 dark:text-neutral-300">{row.label}</span>
            <span className="font-medium tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StackedBar({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  if (!total) return EMPTY

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
        {rows.map((row) =>
          row.value ? (
            <div
              key={row.label}
              className={row.fill}
              style={{ width: `${(row.value / total) * 100}%` }}
              title={`${row.label}: ${row.value}`}
            />
          ) : null
        )}
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${row.fill}`} />
            <span className="flex-1 text-neutral-600 dark:text-neutral-300">{row.label}</span>
            <span className="font-medium tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
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

  const [preset, setPreset] = useState('year')
  const [filters, setFilters] = useState({ ...rangeOf('year'), department: '', employeeType: '' })
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
        title={isHr ? 'Payroll Dashboard' : 'Home'}
        description={
          isHr
            ? 'Live across employees, contracts, attendance, time off and payroll.'
            : 'Mark your day here, then check your leave from the Time Off menu.'
        }
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
              value={inUnits(data.kpis.approvedTimeOffDays)}
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
              <CardBody>
                {/* One day is one of these four, so the split reads better as parts of
                    a whole than as columns where Present dwarfs the exceptions. */}
                <AttendanceDonut
                  rows={ATTENDANCE_STATUSES.map((status) => ({
                    label: status.label,
                    value: data.attendance[status.value],
                    color: ATTENDANCE_COLORS[status.value],
                  }))}
                />

                <dl className="mt-4 space-y-1 border-t border-neutral-200 pt-3 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                  <div className="flex justify-between">
                    <dt>Missing check-outs</dt>
                    <dd className="tabular-nums">{data.attendance.missingCheckOuts}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Manual attendance edits</dt>
                    <dd className="tabular-nums">{data.attendance.manualEdits}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Attendance coverage</dt>
                    <dd className="tabular-nums">
                      {data.kpis.attendanceHealth === null
                        ? '—'
                        : `${data.kpis.attendanceHealth}%`}
                    </dd>
                  </div>
                </dl>
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
                  to="/attendance"
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/40"
                >
                  <span>Attendance corrections waiting</span>
                  <span className="font-semibold tabular-nums">
                    {data.alerts.pendingCorrections}
                  </span>
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
                <Link
                  to="/payslips"
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/40"
                >
                  <span>Duplicate payslip warnings</span>
                  <span className="font-semibold tabular-nums">{data.alerts.duplicatePayslips}</span>
                </Link>
                <Link
                  to="/payruns"
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-700/40"
                >
                  <span>Payruns still not validated</span>
                  <span className="font-semibold tabular-nums">
                    {data.alerts.payrunsNotValidated}
                  </span>
                </Link>
              </CardBody>
            </Card>
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Time Off Overview</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Leave taken and what is left, across the selected period
                </p>
              </CardHeader>
              <CardBody>
                {data.timeOff.length ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-neutral-500">
                        <th className="pb-2 text-left font-medium">Type</th>
                        <th className="pb-2 text-right font-medium">Approved</th>
                        <th className="pb-2 text-right font-medium">Pending</th>
                        <th className="pb-2 text-right font-medium">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                      {data.timeOff.map((row) => (
                        <tr key={row.type}>
                          <td className="py-2">{row.type}</td>
                          <td className="py-2 text-right tabular-nums">{inUnits(row.approved)}</td>
                          <td className="py-2 text-right tabular-nums">{row.pending}</td>
                          <td className="py-2 text-right font-medium tabular-nums">
                            {row.remaining === null ? 'N/A' : inUnits(row.remaining)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    No leave types measured in days yet.
                  </p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">Payslip Status</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  How the payslips in this period stand
                </p>
              </CardHeader>
              <CardBody>
                <StackedBar
                  rows={[
                    { label: 'Paid', value: data.payslipStatus.paid, fill: 'bg-emerald-500' },
                    {
                      label: 'Awaiting payment',
                      value: data.payslipStatus.done,
                      fill: 'bg-blue-500',
                    },
                  ]}
                />
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
                <TrendChart
                  rows={data.trend.map((t) => ({ label: monthLabel(t.month), value: t.net }))}
                  format={compact}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-semibold">Salary Cost by Department</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Payslips grouped by the employee’s department
                </p>
              </CardHeader>
              <CardBody>
                <DepartmentChart
                  rows={data.byDepartment.map((d) => ({ label: d.department, value: d.salary }))}
                  format={compact}
                />
              </CardBody>
            </Card>
          </div>

          <div className="mt-6">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Department Overview</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Headcount and monthly salary, from employees, contracts and payslip totals
                </p>
              </CardHeader>
              <CardBody>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-neutral-500">
                      <th className="pb-2 text-left font-medium">Department</th>
                      <th className="pb-2 text-right font-medium">Headcount</th>
                      <th className="pb-2 text-right font-medium">Monthly Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {data.byDepartment.map((row) => (
                      <tr key={row.department}>
                        <td className="py-2">{row.department}</td>
                        <td className="py-2 text-right tabular-nums">{row.headcount}</td>
                        <td className="py-2 text-right font-medium tabular-nums">
                          {money(row.salary)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </div>

        </>
      ) : null}
    </PageContainer>
  )
}
