import { Contract } from '../models/Contract.js'
import { httpError } from '../utils/asyncHandler.js'

const OPEN_ENDED = new Date('9999-12-31')

/**
 * The contract that applies to a payroll period.
 *
 * Payroll must never take "the latest contract" — an employee whose contract
 * was replaced mid-period has to be paid on the one that actually covered the
 * period. Every payslip computation resolves its contract through here.
 */
export function findContractForPeriod(employeeId, periodStart, periodEnd) {
  return Contract.findOne({
    employee: employeeId,
    state: 'running',
    startDate: { $lte: periodEnd },
    $or: [{ endDate: null }, { endDate: { $gte: periodStart } }],
  })
    .sort({ startDate: -1 })
    .populate('structure')
    .populate('schedule')
}

/** Running contracts for the same employee whose date ranges overlap this one. */
export function findOverlapping({ employee, startDate, endDate, excludeId }) {
  const query = {
    employee,
    state: 'running',
    startDate: { $lte: endDate || OPEN_ENDED },
    $or: [{ endDate: null }, { endDate: { $gte: startDate } }],
  }
  if (excludeId) query._id = { $ne: excludeId }
  return Contract.find(query).select('reference startDate endDate')
}

const asDate = (value) => (value ? new Date(value) : null)

// toISOString() would shift the day for anyone east of UTC.
const format = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'open-ended'

/**
 * Rejects a save that would leave an employee with two running contracts
 * covering the same dates — the spec calls this "avoiding concurrent active
 * contracts", and payroll depends on exactly one match.
 */
export async function assertNoOverlap({ employee, startDate, endDate, state, excludeId }) {
  if (state !== 'running') return

  const start = asDate(startDate)
  const end = asDate(endDate)

  if (end && end < start) {
    throw httpError(400, 'End date cannot be before the start date')
  }

  const clashes = await findOverlapping({ employee, startDate: start, endDate: end, excludeId })
  if (!clashes.length) return

  const clash = clashes[0]
  throw httpError(
    409,
    `This employee already has a running contract (${clash.reference}) from ` +
      `${format(clash.startDate)} to ${format(clash.endDate)}`
  )
}
