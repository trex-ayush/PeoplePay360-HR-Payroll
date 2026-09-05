import { Employee } from '../models/Employee.js'
import { findContractForPeriod } from './contract.js'
import { workingDayNumbers } from './schedule.js'

const MON_TO_FRI = [0, 1, 2, 3, 4]

// Date.getDay() counts from Sunday; schedule lines count from Monday.
const weekdayIndex = (date) => (date.getDay() + 6) % 7

/**
 * How many days of the period the employee was expected to work.
 *
 * Driven by the contract's working schedule rather than a flat 30, so a
 * four-day-week contract prorates differently from a five-day one.
 */
export function workingDaysInPeriod(schedule, periodStart, periodEnd) {
  const days = schedule?.lines?.length ? workingDayNumbers(schedule.lines) : MON_TO_FRI

  let count = 0
  const cursor = new Date(periodStart)
  cursor.setHours(0, 0, 0, 0)
  const last = new Date(periodEnd)
  last.setHours(0, 0, 0, 0)

  while (cursor <= last) {
    if (days.includes(weekdayIndex(cursor))) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}

/**
 * Employees the wizard may offer for a payrun scope.
 *
 * An employee qualifies only when the contract covering this period (R1) points
 * at the payrun's structure — picking "Regular Salary" must not pull in someone
 * whose contract for those dates runs on a different structure.
 */
export async function findEligibleEmployees({ structure, periodStart, periodEnd, employeeTypes }) {
  const filter = { active: true }
  if (employeeTypes?.length) filter.employeeType = { $in: employeeTypes }

  const employees = await Employee.find(filter).sort({ name: 1 })

  const eligible = []

  for (const employee of employees) {
    const contract = await findContractForPeriod(employee._id, periodStart, periodEnd)
    if (!contract || String(contract.structure?._id) !== String(structure)) continue

    eligible.push({
      _id: employee._id,
      name: employee.name,
      code: employee.code,
      employeeType: employee.employeeType,
      contract: {
        _id: contract._id,
        reference: contract.reference,
        startDate: contract.startDate,
        endDate: contract.endDate,
        wage: contract.wage,
      },
      weeklyHours: contract.schedule?.weeklyHours ?? 0,
      scheduleName: contract.schedule?.name ?? '',
    })
  }

  return eligible
}
