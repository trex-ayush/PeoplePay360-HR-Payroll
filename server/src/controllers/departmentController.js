import { Department } from '../models/Department.js'
import { Employee } from '../models/Employee.js'
import { Contract } from '../models/Contract.js'
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

export const remove = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id)
  if (!department) throw httpError(404, 'Department not found')

  const employees = await Employee.countDocuments({ department: department._id })
  if (employees) {
    throw httpError(
      409,
      `${employees} employee${employees > 1 ? 's are' : ' is'} attached to ${department.name}. ` +
        `Move them to another department first.`
    )
  }

  const contracts = await Contract.countDocuments({ department: department._id })
  if (contracts) {
    throw httpError(
      409,
      `${contracts} contract${contracts > 1 ? 's are' : ' is'} attached to ${department.name}. ` +
        `Change or delete them first.`
    )
  }

  await department.deleteOne()
  res.json({ deleted: department.name })
})
