import { Employee } from '../models/Employee.js'
import { Payslip } from '../models/Payslip.js'
import { Payrun } from '../models/Payrun.js'
import { findContractForPeriod } from './contract.js'

// toISOString() would shift the day for anyone east of UTC, and a contract that
// ends on the 30th must not read as the 29th.
const localDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

// R5. Warnings, never blocks — only a person can decide whether an issue matters
// for this run.
export async function getPayrunWarnings(payrun) {
  const employees = await Employee.find({ _id: { $in: payrun.employees } }).select(
    'name code bankAccount'
  )

  // Every other batch that has been signed off. A person appearing twice across
  // two of those is being paid twice for the same period.
  const finalised = await Payrun.find({
    _id: { $ne: payrun._id },
    state: { $in: ['validated', 'paid'] },
    periodStart: { $lte: payrun.periodEnd },
    periodEnd: { $gte: payrun.periodStart },
  }).select('name')

  const duplicates = await Payslip.find({
    payrun: { $in: finalised.map((p) => p._id) },
    employee: { $in: payrun.employees },
  })
    .select('employee payrun')
    .populate({ path: 'payrun', select: 'name' })

  const duplicateBy = new Map(duplicates.map((p) => [String(p.employee), p.payrun?.name]))

  const warnings = []

  const add = (type, severity, employee, message) =>
    warnings.push({
      type,
      severity,
      message,
      employee: { _id: employee._id, name: employee.name, code: employee.code },
      link: `/employees/${employee._id}`,
    })

  for (const employee of employees) {
    if (!employee.bankAccount) {
      add('missing_bank_details', 'warning', employee, 'No bank account on file, so this payslip cannot be paid out')
    }

    const clash = duplicateBy.get(String(employee._id))
    if (clash) {
      add('duplicate_payslip', 'danger', employee, `Already has a payslip in ${clash} for an overlapping period`)
    }

    const contract = await findContractForPeriod(employee._id, payrun.periodStart, payrun.periodEnd)

    if (!contract) {
      add('no_active_contract', 'danger', employee, 'No running contract covers this period, so no payslip will be computed')
      continue
    }

    if (contract.endDate && contract.endDate <= payrun.periodEnd) {
      add(
        'contract_expiring',
        'warning',
        employee,
        `Contract ${contract.reference} ends on ${localDate(contract.endDate)}, inside this period`
      )
    }
  }

  return warnings
}
