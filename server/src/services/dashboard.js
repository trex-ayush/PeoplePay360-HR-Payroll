import { Attendance } from '../models/Attendance.js'
import { AttendanceCorrection } from '../models/AttendanceCorrection.js'
import { Contract } from '../models/Contract.js'
import { Employee } from '../models/Employee.js'
import { Payslip } from '../models/Payslip.js'
import { TimeOffAllocation } from '../models/TimeOffAllocation.js'
import { TimeOffRequest } from '../models/TimeOffRequest.js'
import { TimeOffType } from '../models/TimeOffType.js'
import { Payrun } from '../models/Payrun.js'
import { getBalance } from './leave.js'

const round2 = (n) => Math.round(n * 100) / 100

const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const monthRange = (date, back = 0) => ({
  start: new Date(date.getFullYear(), date.getMonth() - back, 1),
  end: new Date(date.getFullYear(), date.getMonth() - back + 1, 0, 23, 59, 59),
})

const sum = (rows, field) => round2(rows.reduce((total, row) => total + (row[field] ?? 0), 0))

const lastDayOf = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

// The matching span immediately before, so the comparison is like for like. A
// range of whole months steps back by months rather than by its own length in
// days, or September would compare against 2–31 August and miss the 1st.
const previousRange = (from, to) => {
  if (from.getDate() === 1 && to.getDate() === lastDayOf(to)) {
    const months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth() + 1
    return {
      start: new Date(from.getFullYear(), from.getMonth() - months, 1),
      end: new Date(from.getFullYear(), from.getMonth(), 0, 23, 59, 59),
    }
  }

  const span = to - from
  return { start: new Date(from.getTime() - span - 1), end: new Date(from.getTime() - 1) }
}

// A payslip is a whole month's pay and cannot be split across days, so it counts
// only for a range that covers its period end to end. Matching a period the range
// merely touches would break the one thing a reader assumes: that a week inside a
// month can never report more payroll than the month itself.
const containedIn = (ids, from, to) => ({
  employee: { $in: ids },
  periodStart: { $gte: from },
  periodEnd: { $lte: to },
})

// The balance left across everyone's approved allocations of one type. Summed the
// same way a single allocation reports it, so the dashboard cannot drift from the
// number on the allocation itself.
async function remainingFor(employeeIds, typeId) {
  const allocations = await TimeOffAllocation.find({
    employee: { $in: employeeIds },
    type: typeId,
    state: 'approved',
  })

  const balances = await Promise.all(allocations.map((allocation) => getBalance(allocation)))
  return round2(balances.reduce((total, balance) => total + balance.remaining, 0))
}

// Two payslips covering the same period start means somebody is being paid twice.
async function countDuplicatePayslips(employeeIds) {
  const clashes = await Payslip.aggregate([
    { $match: { employee: { $in: employeeIds } } },
    { $group: { _id: { employee: '$employee', periodStart: '$periodStart' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: 'total' },
  ])

  return clashes[0]?.total ?? 0
}

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

  const payslips = await Payslip.find(containedIn(ids, from, to)).select(
    'employee netAmount state'
  )
  const paid = payslips.filter((p) => p.state === 'paid')

  const before = previousRange(from, to)
  const previousPaid = await Payslip.find({
    ...containedIn(ids, before.start, before.end),
    state: 'paid',
  }).select('netAmount')

  const netPaid = sum(paid, 'netAmount')
  const previousNet = sum(previousPaid, 'netAmount')

  const attendance = await Attendance.find({
    employee: { $in: ids },
    date: { $gte: from, $lte: to },
  }).select('status checkIn checkOut manuallyEdited')

  const counted = (status) => attendance.filter((a) => a.status === status).length
  const present = counted('present') + counted('overtime') + counted('late')

  // A day somebody clocked into and never closed is the gap payroll trips over.
  const missingCheckOuts = attendance.filter((a) => a.checkIn && !a.checkOut).length
  const manualEdits = attendance.filter((a) => a.manuallyEdited).length

  const dayTypes = await TimeOffType.find({ unit: 'days' }).select('_id name requiresAllocation')
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

  // Always six months back, whatever the range is — a trend over a single day
  // would say nothing. Never past today, since a future month is always empty.
  const now = new Date()
  const trendEnd = to < now ? to : now

  const trend = []
  for (let back = 5; back >= 0; back -= 1) {
    const range = monthRange(trendEnd, back)
    const slips = await Payslip.find({
      ...containedIn(ids, range.start, range.end),
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
      missingCheckOuts,
      manualEdits,
      records: attendance.length,
    },
    timeOff: await Promise.all(
      dayTypes.map(async (type) => ({
        type: type.name,
        approved: sum(
          requests.filter((r) => r.state === 'approved' && type._id.equals(r.type)),
          'duration'
        ),
        pending: requests.filter((r) => r.state === 'draft' && type._id.equals(r.type)).length,
        // A type nobody allocates has no balance to report, so it says so rather
        // than showing a zero that reads as "all used up".
        remaining: type.requiresAllocation ? await remainingFor(ids, type._id) : null,
      }))
    ),
    // Alerts answer "what is waiting on someone right now", so unlike the KPIs
    // they deliberately ignore the selected period.
    alerts: {
      pendingTimeOff: await TimeOffRequest.countDocuments({
        employee: { $in: ids },
        state: 'draft',
      }),
      pendingCorrections: await AttendanceCorrection.countDocuments({
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
      duplicatePayslips: await countDuplicatePayslips(ids),
      payrunsNotValidated: await Payrun.countDocuments({ state: { $in: ['draft', 'computed'] } }),
    },
  }
}
