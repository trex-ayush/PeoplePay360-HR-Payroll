import { SalaryStructure } from '../models/SalaryStructure.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

export const list = asyncHandler(async (req, res) => {
  const filter = req.query.active === 'all' ? {} : { active: true }
  res.json({ structures: await SalaryStructure.find(filter).sort({ name: 1 }) })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ structure: await SalaryStructure.create(req.body) })
})

export const update = asyncHandler(async (req, res) => {
  const structure = await SalaryStructure.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
  if (!structure) throw httpError(404, 'Salary structure not found')
  res.json({ structure })
})
