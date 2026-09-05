import { Payrun } from '../models/Payrun.js'
import { Payslip } from '../models/Payslip.js'
import { SalaryRule } from '../models/SalaryRule.js'
import { findContractForPeriod } from '../services/contract.js'
import { computePayslipLines, round2 } from '../services/payroll.js'
import { unpaidDaysInPeriod } from '../services/leave.js'
import { findEligibleEmployees } from '../services/payrun.js'
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

  const skipped = []
  const payslips = []

  for (const employeeId of payrun.employees) {
    const contract = await findContractForPeriod(employeeId, payrun.periodStart, payrun.periodEnd)
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
    const unpaidDays = await unpaidDaysInPeriod(employeeId, payrun.periodStart, payrun.periodEnd)
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

  if (payrun.state !== 'validated') throw httpError(400, 'Validate this payrun before paying it')

  payrun.state = 'paid'
  await payrun.save()
  await Payslip.updateMany({ payrun: payrun._id }, { $set: { state: 'paid' } })

  res.json({ payrun })
})

export const remove = asyncHandler(async (req, res) => {
  const payrun = await Payrun.findById(req.params.id)
  if (!payrun) throw httpError(404, 'Payrun not found')
  assertOpen(payrun)

  const { deletedCount } = await Payslip.deleteMany({ payrun: payrun._id })
  await payrun.deleteOne()

  res.json({ deleted: payrun.name, payslipsDeleted: deletedCount })
})
