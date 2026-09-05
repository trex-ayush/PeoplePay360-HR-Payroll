import { TimeOffAllocation } from '../models/TimeOffAllocation.js'
import { TimeOffRequest } from '../models/TimeOffRequest.js'
import { TimeOffType } from '../models/TimeOffType.js'
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
export async function getBalance(allocation) {
  // Matched on the link set at approval, not on dates: two allocations may cover
  // the same window, and a request is only ever drawn from one of them.
  const approved = await TimeOffRequest.find({
    allocation: allocation._id,
    state: 'approved',
  }).select('paidDuration')

  const taken = round2(approved.reduce((total, request) => total + request.paidDuration, 0))

  const accrued = accruedOn(allocation)

  return {
    allocated: allocation.allocated,
    accrued,
    taken,
    remaining: round2(accrued - taken),
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
