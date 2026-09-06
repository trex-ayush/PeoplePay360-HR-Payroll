import { Payrun } from '../models/Payrun.js'
import { Payslip } from '../models/Payslip.js'
import { SalaryRule } from '../models/SalaryRule.js'
import { findContractsForPeriod } from '../services/contract.js'
import { computePayslipLines, round2 } from '../services/payroll.js'
import { unpaidDaysByEmployee } from '../services/leave.js'
import { findEligibleEmployees } from '../services/payrun.js'
import { getPayrunWarnings } from '../services/warnings.js'
import { payslipEmail, send } from '../services/mailer.js'
import { env } from '../config/env.js'
import { workingDaysBetween } from '../services/schedule.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

const POPULATE = [{ path: 'structure', select: 'name code' }]

const LOCKED = ['validated', 'paid']

function assertOpen(payrun) {
  if (LOCKED.includes(payrun.state)) {
    throw httpError(409, `This payrun is ${payrun.state} and can no longer be changed`)
  }
}

export const list = asyncHandler(async (req, res) => {
  const { state, search, year } = req.query

  const filter = {}
  if (state) filter.state = state
  if (search) filter.name = new RegExp(search, 'i')
  if (year) {
    filter.periodStart = {
      $gte: new Date(Number(year), 0, 1),
      $lte: new Date(Number(year), 11, 31),
    }
  }

  const payruns = await Payrun.find(filter).populate(POPULATE).sort({ periodStart: -1 }).lean()

  const counts = await Payslip.aggregate([
    { $group: { _id: '$payrun', payslips: { $sum: 1 }, netAmount: { $sum: '$netAmount' } } },
  ])
  const byPayrun = new Map(counts.map((c) => [String(c._id), c]))

  res.json({
    payruns: payruns.map((payrun) => ({
      ...payrun,
      employeeCount: payrun.employees.length,
      payslips: byPayrun.get(String(payrun._id))?.payslips ?? 0,
      netAmount: byPayrun.get(String(payrun._id))?.netAmount ?? 0,
    })),
  })
})

// Creates nothing: the spec is explicit that Continue must not bring a payrun
// into existence.
export const eligibleEmployees = asyncHandler(async (req, res) => {
  const { structure, start, end, employeeTypes } = req.query

  if (!structure || !start || !end) {
    throw httpError(400, 'Structure and period are required to list eligible employees')
  }

  const employees = await findEligibleEmployees({
    structure,
    periodStart: new Date(start),
    periodEnd: new Date(end),
    employeeTypes: employeeTypes ? employeeTypes.split(',').filter(Boolean) : [],
  })

  res.json({ employees })
})

export const getOne = asyncHandler(async (req, res) => {
  const payrun = await Payrun.findById(req.params.id)
    .populate(POPULATE)
    .populate({ path: 'employees', select: 'name code' })
  if (!payrun) throw httpError(404, 'Payrun not found')

  const payslips = await Payslip.find({ payrun: payrun._id })
    .populate({ path: 'employee', select: 'name code' })
    .sort({ createdAt: 1 })

  res.json({ payrun, payslips })
})

export const warnings = asyncHandler(async (req, res) => {
  const payrun = await Payrun.findById(req.params.id)
  if (!payrun) throw httpError(404, 'Payrun not found')

  res.json({ warnings: await getPayrunWarnings(payrun) })
})

export const create = asyncHandler(async (req, res) => {
  const { employees } = req.body
  if (!employees?.length) throw httpError(400, 'Select at least one employee for this payrun')

  const payrun = await Payrun.create(req.body)
  res.status(201).json({ payrun: await payrun.populate(POPULATE) })
})

export const compute = asyncHandler(async (req, res) => {
  const payrun = await Payrun.findById(req.params.id)
  if (!payrun) throw httpError(404, 'Payrun not found')
  assertOpen(payrun)

  const rules = await SalaryRule.find({ structure: payrun.structure, active: true }).lean()
  if (!rules.length) throw httpError(400, 'This salary structure has no rules to compute')

  await Payslip.deleteMany({ payrun: payrun._id })

  // Both lookups are done once for the whole batch. Asking per employee turned a
  // run's cost into the number of round trips rather than the work in it.
  const contracts = await findContractsForPeriod(
    payrun.employees,
    payrun.periodStart,
    payrun.periodEnd
  )
  const unpaidByEmployee = await unpaidDaysByEmployee(
    payrun.employees,
    payrun.periodStart,
    payrun.periodEnd
  )

  const skipped = []
  const payslips = []

  for (const employeeId of payrun.employees) {
    const contract = contracts.get(String(employeeId))
    if (!contract) {
      skipped.push(String(employeeId))
      continue
    }

    const totalWorkingDays = workingDaysBetween(
      contract.schedule,
      payrun.periodStart,
      payrun.periodEnd
    )

    // Unpaid leave is the only thing that shortens a month right now; attendance
    // will feed the same number once it exists.
    const unpaidDays = unpaidByEmployee.get(String(employeeId)) ?? 0
    const workedDays = Math.max(0, round2(totalWorkingDays - unpaidDays))

    const { lines, gross, deductions, net } = computePayslipLines(rules, {
      wage: contract.wage,
      workedDays,
      totalWorkingDays,
    })

    payslips.push({
      payrun: payrun._id,
      employee: employeeId,
      contract: contract._id,
      structure: payrun.structure,
      structureName: contract.structure?.name ?? '',
      wage: contract.wage,
      periodStart: payrun.periodStart,
      periodEnd: payrun.periodEnd,
      workedDays,
      totalWorkingDays,
      lines,
      grossAmount: gross,
      deductionAmount: deductions,
      netAmount: net,
    })
  }

  await Payslip.insertMany(payslips)

  payrun.state = 'computed'
  await payrun.save()

  res.json({ computed: payslips.length, skipped })
})

export const validate = asyncHandler(async (req, res) => {
  const payrun = await Payrun.findById(req.params.id)
  if (!payrun) throw httpError(404, 'Payrun not found')
  assertOpen(payrun)

  if (payrun.state !== 'computed') throw httpError(400, 'Compute this payrun before validating it')

  payrun.state = 'validated'
  await payrun.save()

  res.json({ payrun })
})

export const markPaid = asyncHandler(async (req, res) => {
  const payrun = await Payrun.findById(req.params.id)
  if (!payrun) throw httpError(404, 'Payrun not found')

  // Paying again is allowed: a payslip held back for a missing bank account can
  // be settled once the account is filled in, without redoing the run.
  if (!LOCKED.includes(payrun.state)) {
    throw httpError(400, 'Validate this payrun before paying it')
  }

  const payslips = await Payslip.find({ payrun: payrun._id }).populate({
    path: 'employee',
    select: 'name bankAccount',
  })

  // The warning on this run says a payslip with no account cannot be paid out, so
  // it is left unpaid instead of being marked off. Add the account and pay again.
  const payable = payslips.filter((payslip) => payslip.employee?.bankAccount)
  const held = payslips.filter((payslip) => !payslip.employee?.bankAccount)

  await Payslip.updateMany(
    { _id: { $in: payable.map((payslip) => payslip._id) } },
    { $set: { state: 'paid' } }
  )

  payrun.state = 'paid'
  await payrun.save()

  res.json({
    payrun,
    paid: payable.length,
    held: held.map((payslip) => payslip.employee?.name ?? 'Unknown'),
  })
})

// B8. Only a signed-off run goes out, so nobody receives a payslip that is still
// being recomputed.
export const sendPayslips = asyncHandler(async (req, res) => {
  const payrun = await Payrun.findById(req.params.id)
  if (!payrun) throw httpError(404, 'Payrun not found')

  if (!LOCKED.includes(payrun.state)) {
    throw httpError(400, 'Validate this payrun before sending its payslips')
  }

  const payslips = await Payslip.find({ payrun: payrun._id }).populate({
    path: 'employee',
    select: 'name workEmail',
  })

  let sent = 0
  const failed = []

  for (const payslip of payslips) {
    const to = payslip.employee?.workEmail
    if (!to) {
      failed.push(`${payslip.employee?.name ?? 'Unknown'} has no work email`)
      continue
    }

    const ok = await send({
      to,
      ...payslipEmail({ payslip, link: `${env.clientOrigin}/payslips/${payslip._id}/print` }),
    })

    if (!ok) {
      failed.push(`${payslip.employee.name} could not be emailed`)
      continue
    }

    payslip.emailedAt = new Date()
    await payslip.save()
    sent += 1
  }

  res.json({ sent, failed })
})

export const remove = asyncHandler(async (req, res) => {
  const payrun = await Payrun.findById(req.params.id)
  if (!payrun) throw httpError(404, 'Payrun not found')
  assertOpen(payrun)

  const { deletedCount } = await Payslip.deleteMany({ payrun: payrun._id })
  await payrun.deleteOne()

  res.json({ deleted: payrun.name, payslipsDeleted: deletedCount })
})
