import { TimeOffType } from '../models/TimeOffType.js'
import { TimeOffAllocation } from '../models/TimeOffAllocation.js'
import { TimeOffRequest } from '../models/TimeOffRequest.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

export const list = asyncHandler(async (req, res) => {
  const { search, active } = req.query

  const filter = {}
  if (search) filter.name = new RegExp(search, 'i')
  if (active !== 'all') filter.active = true

  const types = await TimeOffType.find(filter).sort({ name: 1 })
  res.json({ types })
})

export const getOne = asyncHandler(async (req, res) => {
  const type = await TimeOffType.findById(req.params.id)
  if (!type) throw httpError(404, 'Time off type not found')
  res.json({ type })
})

export const create = asyncHandler(async (req, res) => {
  const type = await TimeOffType.create(req.body)
  res.status(201).json({ type })
})

export const update = asyncHandler(async (req, res) => {
  const type = await TimeOffType.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
  if (!type) throw httpError(404, 'Time off type not found')
  res.json({ type })
})

export const remove = asyncHandler(async (req, res) => {
  const type = await TimeOffType.findById(req.params.id)
  if (!type) throw httpError(404, 'Time off type not found')

  const [allocations, requests] = await Promise.all([
    TimeOffAllocation.countDocuments({ type: type._id }),
    TimeOffRequest.countDocuments({ type: type._id }),
  ])

  if (allocations || requests) {
    const parts = []
    if (allocations) parts.push(`${allocations} allocation${allocations === 1 ? '' : 's'}`)
    if (requests) parts.push(`${requests} request${requests === 1 ? '' : 's'}`)
    throw httpError(409, `${parts.join(' and ')} still use this type. Remove those first.`)
  }

  await type.deleteOne()
  res.json({ deleted: type.name })
})
