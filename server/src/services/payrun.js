import { Employee } from '../models/Employee.js'
import { findContractsForPeriod } from './contract.js'

// An employee qualifies only when the contract covering this period (R1) points at
// the payrun's structure, so picking one structure cannot pull in another's staff.
export async function findEligibleEmployees({ structure, periodStart, periodEnd, employeeTypes }) {
  const filter = { active: true }
  if (employeeTypes?.length) filter.employeeType = { $in: employeeTypes }

  const employees = await Employee.find(filter).sort({ name: 1 })

  const contracts = await findContractsForPeriod(
    employees.map((e) => e._id),
    periodStart,
    periodEnd
  )

  const eligible = []

  for (const employee of employees) {
    const contract = contracts.get(String(employee._id))
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
