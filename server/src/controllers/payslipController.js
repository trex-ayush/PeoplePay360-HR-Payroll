import { Employee } from '../models/Employee.js'
import { Payslip } from '../models/Payslip.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'
import { paginate } from '../utils/paginate.js'

const POPULATE = [
  { path: 'employee', select: 'name code workEmail department jobPosition bankAccount' },
  { path: 'payrun', select: 'name state periodStart periodEnd' },
  { path: 'structure', select: 'name code' },
  { path: 'contract', select: 'reference startDate endDate wage' },
]

export const list = asyncHandler(async (req, res) => {
  const { payrun, employee, state, search, page, pageSize } = req.query

  const filter = {}
  if (payrun) filter.payrun = payrun
  if (employee) filter.employee = employee
  if (state) filter.state = state

  // The name being searched sits on the employee, not the payslip, so the
  // matching employees are resolved first and the payslips filtered by them.
  if (search && !employee) {
    const matching = await Employee.find({
      $or: [{ name: new RegExp(search, 'i') }, { code: new RegExp(search, 'i') }],
    })
      .select('_id')
      .lean()
    filter.employee = { $in: matching.map((e) => e._id) }
  }

  const { rows, ...meta } = await paginate(Payslip, filter, {
    sort: { periodStart: -1 },
    populate: POPULATE,
    page,
    pageSize,
  })

  res.json({ payslips: rows, ...meta })
})

export const getOne = asyncHandler(async (req, res) => {
  const payslip = await Payslip.findById(req.params.id).populate(POPULATE)
  if (!payslip) throw httpError(404, 'Payslip not found')
  res.json({ payslip })
})
