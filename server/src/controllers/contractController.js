import { Contract } from '../models/Contract.js'
import { assertNoOverlap } from '../services/contract.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'
import { paginate } from '../utils/paginate.js'

const POPULATE = [
  { path: 'employee', select: 'name code' },
  { path: 'department', select: 'name' },
  { path: 'structure', select: 'name code' },
  { path: 'schedule', select: 'name weeklyHours' },
]

export const list = asyncHandler(async (req, res) => {
  const { employee, state, search, page, pageSize } = req.query

  const filter = {}
  if (employee) filter.employee = employee
  if (state) filter.state = state
  if (search) filter.reference = new RegExp(search, 'i')

  const { rows, ...meta } = await paginate(Contract, filter, {
    sort: { startDate: -1 },
    populate: POPULATE,
    page,
    pageSize,
  })

  res.json({ contracts: rows, ...meta })
})

// CON/2026/0001 — highest sequence used in that year, plus one.
export const nextReference = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear()

  const existing = await Contract.find({ reference: new RegExp(`^CON/${year}/\\d+$`) })
    .select('reference')
    .lean()

  const highest = existing.reduce(
    (max, c) => Math.max(max, Number(c.reference.split('/')[2]) || 0),
    0
  )

  res.json({ reference: `CON/${year}/${String(highest + 1).padStart(4, '0')}` })
})

export const getOne = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).populate(POPULATE)
  if (!contract) throw httpError(404, 'Contract not found')
  res.json({ contract })
})

export const create = asyncHandler(async (req, res) => {
  await assertNoOverlap(req.body)
  const contract = await Contract.create(req.body)
  res.status(201).json({ contract: await contract.populate(POPULATE) })
})

export const remove = asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id)
  if (!contract) throw httpError(404, 'Contract not found')

  await contract.deleteOne()
  res.json({ deleted: contract.reference })
})

export const update = asyncHandler(async (req, res) => {
  const existing = await Contract.findById(req.params.id)
  if (!existing) throw httpError(404, 'Contract not found')

  await assertNoOverlap({
    employee: req.body.employee ?? existing.employee,
    startDate: req.body.startDate ?? existing.startDate,
    endDate: req.body.endDate === undefined ? existing.endDate : req.body.endDate,
    state: req.body.state ?? existing.state,
    excludeId: existing._id,
  })

  Object.assign(existing, req.body)
  await existing.save()

  res.json({ contract: await existing.populate(POPULATE) })
})
