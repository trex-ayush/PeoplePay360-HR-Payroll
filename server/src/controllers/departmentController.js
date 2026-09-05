import { Department } from '../models/Department.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

export const list = asyncHandler(async (req, res) => {
  const filter = req.query.active === 'all' ? {} : { active: true }
  res.json({ departments: await Department.find(filter).sort({ name: 1 }) })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ department: await Department.create(req.body) })
})

export const update = asyncHandler(async (req, res) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
  if (!department) throw httpError(404, 'Department not found')
  res.json({ department })
})
