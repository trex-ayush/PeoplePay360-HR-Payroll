import { TimeOffAllocation } from '../models/TimeOffAllocation.js'
import { TimeOffRequest } from '../models/TimeOffRequest.js'
import { TimeOffType } from '../models/TimeOffType.js'
import { Employee } from '../models/Employee.js'
import { workingDaysBetween } from './schedule.js'
import { httpError } from '../utils/asyncHandler.js'

const round2 = (n) => Math.round(n * 100) / 100

export function computeDuration({ schedule, unit }, dateFrom, dateTo) {
  const days = workingDaysBetween(schedule, dateFrom, dateTo)
  if (unit !== 'hours') return days

  const hoursPerDay = schedule?.daysPerWeek ? schedule.weeklyHours / schedule.daysPerWeek : 8
  return round2(days * hoursPerDay)
}

// Accrual lands at month end, so a month counts once `to` reaches its last day.
// A Jan–Dec window therefore pays twelve months, not eleven.
function monthsAccrued(from, to) {
  if (to < from) return 0

  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  const monthEnd = new Date(to.getFullYear(), to.getMonth() + 1, 0)

  return Math.max(0, to >= monthEnd ? months + 1 : months)
}

// Under accrual the balance is earned month by month rather than granted up front,
// so on 1 March an employee on 1.5/month has 3 days, not the full year's 18.
export function accruedOn(allocation, onDate = new Date()) {
  if (allocation.mode !== 'accrual') return allocation.allocated

  const validTo = new Date(allocation.validTo)
  const upto = onDate < validTo ? onDate : validTo
  const earned = allocation.accrualRate * monthsAccrued(new Date(allocation.validFrom), upto)

  return Math.min(round2(earned), allocation.allocated)
}

// R4. Taken is summed from approved requests rather than stored on the allocation,
// so refusing one gives the balance back with no counter to keep in step.
export async function getBalance(allocation, exclude) {
  // Matched on the link set at approval, not on dates: two allocations may cover
  // the same window, and a request is only ever drawn from one of them.
  const approved = await TimeOffRequest.find({
    allocation: allocation._id,
    state: 'approved',
  }).select('paidDuration')

  const taken = round2(approved.reduce((total, request) => total + request.paidDuration, 0))

  // Requests awaiting a decision have no allocation link yet, so they match on
  // employee and type. They are held back from `available` but not from
  // `remaining`, which is what an approval is measured against.
  const waiting = await TimeOffRequest.find({
    employee: allocation.employee,
    type: allocation.type,
    state: 'draft',
    dateFrom: { $gte: allocation.validFrom, $lte: allocation.validTo },
    ...(exclude ? { _id: { $ne: exclude } } : {}),
  }).select('duration')

  const pending = round2(waiting.reduce((total, request) => total + request.duration, 0))
  const accrued = accruedOn(allocation)
  const remaining = round2(accrued - taken)

  return {
    allocated: allocation.allocated,
    accrued,
    taken,
    pending,
    remaining,
    available: round2(remaining - pending),
  }
}

// Nobody signs off on their own leave. Admin stays the way out for a company
// with a single HR person, who would otherwise be stuck forever.
export function assertNotSelf(actor, employeeId, what) {
  if (actor.hasRole('admin')) return

  if (actor.employeeId && String(actor.employeeId) === String(employeeId)) {
    throw httpError(403, `You cannot approve your own ${what}. Ask another HR user to review it.`)
  }
}

// A type set to manager approval is decided by that employee's own manager, so
// the setting changes who can act rather than only labelling the policy.
export async function assertCanDecide(actor, request, type) {
  if (actor.hasRole('admin') || type.approvalBy !== 'manager') return

  const employee = await Employee.findById(request.employee).select('manager name')
  if (!employee?.manager) {
    throw httpError(400, `${employee?.name ?? 'This employee'} has no manager set, so nobody can approve ${type.name}`)
  }
  if (String(employee.manager) !== String(actor.employeeId)) {
    throw httpError(403, `${type.name} is approved by the employee's manager`)
  }
}

export function findAllocationFor(employee, type, dateFrom, dateTo) {
  return TimeOffAllocation.findOne({
    employee,
    type,
    state: 'approved',
    validFrom: { $lte: dateFrom },
    validTo: { $gte: dateTo },
  }).sort({ validFrom: -1 })
}

// Splits an approval into what the balance can pay for and what it cannot. The
// overflow is leave without pay, so the employee still gets the days off and
// payroll deducts the difference.
export async function splitDuration(request, type, requestedPaid) {
  if (!type.requiresAllocation) {
    return { allocation: null, paidDuration: request.duration, unpaidDuration: 0 }
  }

  const allocation = await findAllocationFor(
    request.employee,
    request.type,
    request.dateFrom,
    request.dateTo
  )

  if (!allocation) {
    throw httpError(
      400,
      `${type.name} needs an approved allocation covering these dates, and this employee has none`
    )
  }

  const { remaining } = await getBalance(allocation)
  const payable = Math.min(request.duration, Math.max(0, remaining))
  const paid = requestedPaid === undefined ? payable : Number(requestedPaid)

  if (Number.isNaN(paid) || paid < 0 || paid > payable) {
    throw httpError(
      400,
      `At most ${payable} ${type.unit} can be paid from this allocation, ${paid} asked`
    )
  }

  return {
    allocation,
    paidDuration: round2(paid),
    unpaidDuration: round2(request.duration - paid),
  }
}

// Unpaid leave the employee took in a payroll period, which is what turns a full
// month of worked days into a short one.
// The same total for a whole payrun in one query, keyed by employee id.
export async function unpaidDaysByEmployee(employeeIds, periodStart, periodEnd) {
  const requests = await TimeOffRequest.find({
    employee: { $in: employeeIds },
    state: 'approved',
    unpaidDuration: { $gt: 0 },
    dateFrom: { $gte: periodStart, $lte: periodEnd },
  }).populate({ path: 'type', select: 'unit', model: TimeOffType })

  const days = new Map()
  for (const request of requests) {
    if (request.type?.unit !== 'days') continue
    const key = String(request.employee)
    days.set(key, round2((days.get(key) ?? 0) + request.unpaidDuration))
  }

  return days
}

export async function unpaidDaysInPeriod(employee, periodStart, periodEnd) {
  const requests = await TimeOffRequest.find({
    employee,
    state: 'approved',
    unpaidDuration: { $gt: 0 },
    dateFrom: { $gte: periodStart, $lte: periodEnd },
  }).populate({ path: 'type', select: 'unit', model: TimeOffType })

  const days = requests
    .filter((request) => request.type?.unit === 'days')
    .reduce((total, request) => total + request.unpaidDuration, 0)

  return round2(days)
}
