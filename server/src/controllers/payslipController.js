import { Payslip } from '../models/Payslip.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

const POPULATE = [
  { path: 'employee', select: 'name code workEmail department jobPosition' },
  { path: 'payrun', select: 'name state periodStart periodEnd' },
  { path: 'structure', select: 'name code' },
  { path: 'contract', select: 'reference startDate endDate wage' },
]

export const list = asyncHandler(async (req, res) => {
  const { payrun, employee, state } = req.query

  const filter = {}
  if (payrun) filter.payrun = payrun
  if (employee) filter.employee = employee
  if (state) filter.state = state

  const payslips = await Payslip.find(filter).populate(POPULATE).sort({ periodStart: -1 })

  res.json({ payslips })
})

export const getOne = asyncHandler(async (req, res) => {
  const payslip = await Payslip.findById(req.params.id).populate(POPULATE)
  if (!payslip) throw httpError(404, 'Payslip not found')
  res.json({ payslip })
})
