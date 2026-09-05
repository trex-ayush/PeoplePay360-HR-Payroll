import { Attendance } from '../models/Attendance.js'
import { Contract } from '../models/Contract.js'
import { Employee } from '../models/Employee.js'
import { Payslip } from '../models/Payslip.js'
import { TimeOffRequest } from '../models/TimeOffRequest.js'
import { TimeOffType } from '../models/TimeOffType.js'

const round2 = (n) => Math.round(n * 100) / 100

const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const monthRange = (date, back = 0) => ({
  start: new Date(date.getFullYear(), date.getMonth() - back, 1),
  end: new Date(date.getFullYear(), date.getMonth() - back + 1, 0, 23, 59, 59),
})

const sum = (rows, field) => round2(rows.reduce((total, row) => total + (row[field] ?? 0), 0))

// A payslip covers a whole month, so it belongs to any range that touches it.
// Filtering on its start date would empty the payroll figures for "today".
const overlapping = (ids, from, to) => ({
  employee: { $in: ids },
  periodStart: { $lte: to },
  periodEnd: { $gte: from },
})

// Everything here is read off real records. A number that cannot be derived is
// left out rather than filled in, because the spec asks for live data.
export async function getDashboard({ from, to, department, employeeType }) {
  const employeeFilter = { active: true }
  if (department) employeeFilter.department = department
  if (employeeType) employeeFilter.employeeType = employeeType

  const employees = await Employee.find(employeeFilter)
    .select('name department')
    .populate({ path: 'department', select: 'name' })

  const ids = employees.map((e) => e._id)

  const payslips = await Payslip.find(overlapping(ids, from, to)).select(
    'employee netAmount state'
  )
  const paid = payslips.filter((p) => p.state === 'paid')

  // The same span again, immediately before, so the comparison is like for like.
  const span = to - from
  const previousPaid = await Payslip.find({
    ...overlapping(ids, new Date(from.getTime() - span - 1), new Date(from.getTime() - 1)),
    state: 'paid',
  }).select('netAmount')

  const netPaid = sum(paid, 'netAmount')
  const previousNet = sum(previousPaid, 'netAmount')

  const attendance = await Attendance.find({
    employee: { $in: ids },
    date: { $gte: from, $lte: to },
  }).select('status')

  const counted = (status) => attendance.filter((a) => a.status === status).length
  const present = counted('present') + counted('overtime') + counted('late')

  const dayTypes = await TimeOffType.find({ unit: 'days' }).select('_id name')
  const dayTypeIds = dayTypes.map((t) => t._id)

  const requests = await TimeOffRequest.find({
    employee: { $in: ids },
    dateFrom: { $gte: from, $lte: to },
  }).select('type duration state')

  const approvedDays = sum(
    requests.filter((r) => r.state === 'approved' && dayTypeIds.some((id) => id.equals(r.type))),
    'duration'
  )

  const netByEmployee = new Map()
  for (const slip of payslips) {
    const key = String(slip.employee)
    netByEmployee.set(key, (netByEmployee.get(key) ?? 0) + slip.netAmount)
  }

  const departments = new Map()
  for (const employee of employees) {
    const name = employee.department?.name ?? 'Unassigned'
    const row = departments.get(name) ?? { department: name, headcount: 0, salary: 0 }
    row.headcount += 1
    row.salary += netByEmployee.get(String(employee._id)) ?? 0
    departments.set(name, row)
  }

  // Always six months back from the end of the range, whatever the range is —
  // a trend over a single day would say nothing.
  const trend = []
  for (let back = 5; back >= 0; back -= 1) {
    const range = monthRange(to, back)
    const slips = await Payslip.find({
      ...overlapping(ids, range.start, range.end),
      state: 'paid',
    }).select('netAmount')

    trend.push({ month: monthKey(range.start), net: sum(slips, 'netAmount') })
  }

  const expiringSoon = new Date()
  expiringSoon.setDate(expiringSoon.getDate() + 30)

  return {
    kpis: {
      netPaid,
      netChange: previousNet ? round2(((netPaid - previousNet) / previousNet) * 100) : null,
      payslips: payslips.length,
      payslipsPaid: paid.length,
      avgSalary: payslips.length ? round2(sum(payslips, 'netAmount') / payslips.length) : 0,
      approvedTimeOffDays: approvedDays,
      attendanceHealth: attendance.length ? Math.round((present / attendance.length) * 100) : null,
    },
    trend,
    byDepartment: [...departments.values()].sort((a, b) => b.salary - a.salary),
    payslipStatus: {
      paid: paid.length,
      done: payslips.filter((p) => p.state === 'done').length,
    },
    attendance: {
      present: counted('present'),
      late: counted('late'),
      absent: counted('absent'),
      overtime: counted('overtime'),
    },
    timeOff: dayTypes.map((type) => ({
      type: type.name,
      approved: sum(
        requests.filter((r) => r.state === 'approved' && type._id.equals(r.type)),
        'duration'
      ),
      pending: requests.filter((r) => r.state === 'draft' && type._id.equals(r.type)).length,
    })),
    // Alerts answer "what is waiting on someone right now", so unlike the KPIs
    // they deliberately ignore the selected period.
    alerts: {
      pendingTimeOff: await TimeOffRequest.countDocuments({
        employee: { $in: ids },
        state: 'draft',
      }),
      contractsExpiring: await Contract.countDocuments({
        employee: { $in: ids },
        state: 'running',
        endDate: { $ne: null, $gte: new Date(), $lte: expiringSoon },
      }),
      employeesWithoutBankAccount: await Employee.countDocuments({
        ...employeeFilter,
        $or: [{ bankAccount: '' }, { bankAccount: null }],
      }),
    },
  }
}
