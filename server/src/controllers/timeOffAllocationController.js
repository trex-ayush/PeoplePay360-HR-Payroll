import { TimeOffAllocation } from '../models/TimeOffAllocation.js'
import { TimeOffRequest } from '../models/TimeOffRequest.js'
import { getBalance } from '../services/leave.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

const POPULATE = [
  { path: 'employee', select: 'name code' },
  { path: 'type', select: 'name unit requiresAllocation' },
  { path: 'approver', select: 'name' },
]

const withBalance = async (allocation) => ({
  ...allocation.toObject(),
  ...(await getBalance(allocation)),
})

export const list = asyncHandler(async (req, res) => {
  const { employee, type, state } = req.query

  const filter = {}
  if (employee) filter.employee = employee
  if (type) filter.type = type
  if (state) filter.state = state

  const allocations = await TimeOffAllocation.find(filter)
    .populate(POPULATE)
    .sort({ validFrom: -1 })

  res.json({ allocations: await Promise.all(allocations.map(withBalance)) })
})

export const getOne = asyncHandler(async (req, res) => {
  const allocation = await TimeOffAllocation.findById(req.params.id).populate(POPULATE)
  if (!allocation) throw httpError(404, 'Allocation not found')
  res.json({ allocation: await withBalance(allocation) })
})

export const create = asyncHandler(async (req, res) => {
  const allocation = await TimeOffAllocation.create(req.body)
  res.status(201).json({ allocation: await allocation.populate(POPULATE) })
})

export const update = asyncHandler(async (req, res) => {
  const allocation = await TimeOffAllocation.findById(req.params.id)
  if (!allocation) throw httpError(404, 'Allocation not found')

  Object.assign(allocation, req.body)
  await allocation.save()

  res.json({ allocation: await allocation.populate(POPULATE) })
})

export const approve = asyncHandler(async (req, res) => {
  const allocation = await TimeOffAllocation.findById(req.params.id)
  if (!allocation) throw httpError(404, 'Allocation not found')

  allocation.state = 'approved'
  allocation.approver = req.user._id
  await allocation.save()

  res.json({ allocation: await allocation.populate(POPULATE) })
})

export const refuse = asyncHandler(async (req, res) => {
  const allocation = await TimeOffAllocation.findById(req.params.id)
  if (!allocation) throw httpError(404, 'Allocation not found')

  const { taken } = await getBalance(allocation)
  if (taken > 0) {
    throw httpError(
      409,
      `${taken} ${allocation.type.unit ?? 'days'} have already been taken against this allocation`
    )
  }

  allocation.state = 'refused'
  allocation.approver = req.user._id
  await allocation.save()

  res.json({ allocation: await allocation.populate(POPULATE) })
})

export const remove = asyncHandler(async (req, res) => {
  const allocation = await TimeOffAllocation.findById(req.params.id)
  if (!allocation) throw httpError(404, 'Allocation not found')

  const approved = await TimeOffRequest.countDocuments({
    allocation: allocation._id,
    state: 'approved',
  })

  if (approved) {
    throw httpError(
      409,
      `${approved} approved request${approved === 1 ? '' : 's'} consume this allocation. ` +
        'Refuse those first.'
    )
  }

  await allocation.deleteOne()
  res.json({ deleted: allocation._id })
})
