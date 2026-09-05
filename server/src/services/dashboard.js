import { Attendance } from '../models/Attendance.js'
import { Contract } from '../models/Contract.js'
import { Employee } from '../models/Employee.js'
import { Payslip } from '../models/Payslip.js'
import { TimeOffRequest } from '../models/TimeOffRequest.js'
import { TimeOffType } from '../models/TimeOffType.js'

const round2 = (n) => Math.round(n * 100) / 100

const monthRange = (month) => {
  const [year, index] = month.split('-').map(Number)
  return { start: new Date(year, index - 1, 1), end: new Date(year, index, 0, 23, 59, 59) }
}

const shiftMonth = (month, by) => {
  const [year, index] = month.split('-').map(Number)
  const date = new Date(year, index - 1 + by, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const sum = (rows, field) => round2(rows.reduce((total, row) => total + (row[field] ?? 0), 0))

// Everything here is read off real records. A number that cannot be derived is
// left out rather than filled in, because the spec asks for live data.
export async function getDashboard({ month, department, employeeType }) {
  const { start, end } = monthRange(month)

  const employeeFilter = { active: true }
  if (department) employeeFilter.department = department
  if (employeeType) employeeFilter.employeeType = employeeType

  const employees = await Employee.find(employeeFilter)
    .select('name department')
    .populate({ path: 'department', select: 'name' })

  const ids = employees.map((e) => e._id)

  const payslips = await Payslip.find({
    employee: { $in: ids },
    periodStart: { $gte: start, $lte: end },
  }).select('employee netAmount state')

  const paid = payslips.filter((p) => p.state === 'paid')

  const previous = monthRange(shiftMonth(month, -1))
  const previousPaid = await Payslip.find({
    employee: { $in: ids },
    periodStart: { $gte: previous.start, $lte: previous.end },
    state: 'paid',
  }).select('netAmount')

  const netPaid = sum(paid, 'netAmount')
  const previousNet = sum(previousPaid, 'netAmount')

  const attendance = await Attendance.find({
    employee: { $in: ids },
    date: { $gte: start, $lte: end },
  }).select('status')

  const counted = (status) => attendance.filter((a) => a.status === status).length
  const present = counted('present') + counted('overtime') + counted('late')

  const dayTypes = await TimeOffType.find({ unit: 'days' }).select('_id name')
  const dayTypeIds = dayTypes.map((t) => t._id)

  const requests = await TimeOffRequest.find({
    employee: { $in: ids },
    dateFrom: { $gte: start, $lte: end },
  }).select('type duration state')

  const approvedDays = sum(
    requests.filter(
      (r) => r.state === 'approved' && dayTypeIds.some((id) => id.equals(r.type))
    ),
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

  const trend = []
  for (let back = 5; back >= 0; back -= 1) {
    const key = shiftMonth(month, -back)
    const range = monthRange(key)
    const slips = await Payslip.find({
      employee: { $in: ids },
      periodStart: { $gte: range.start, $lte: range.end },
      state: 'paid',
    }).select('netAmount')

    trend.push({ month: key, net: sum(slips, 'netAmount') })
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
    alerts: {
      pendingTimeOff: requests.filter((r) => r.state === 'draft').length,
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
