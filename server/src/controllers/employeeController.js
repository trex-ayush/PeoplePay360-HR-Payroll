import { Employee } from '../models/Employee.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

const POPULATE = [
  { path: 'department', select: 'name' },
  { path: 'manager', select: 'name code' },
  { path: 'schedule', select: 'name weeklyHours' },
]

export const list = asyncHandler(async (req, res) => {
  const { search, department, employeeType, active = 'true' } = req.query

  const filter = {}
  if (active !== 'all') filter.active = active !== 'false'
  if (department) filter.department = department
  if (employeeType) filter.employeeType = employeeType
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { code: new RegExp(search, 'i') },
      { workEmail: new RegExp(search, 'i') },
      { jobPosition: new RegExp(search, 'i') },
    ]
  }

  const employees = await Employee.find(filter).populate(POPULATE).sort({ name: 1 })
  res.json({ employees })
})

export const getOne = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).populate(POPULATE)
  if (!employee) throw httpError(404, 'Employee not found')
  res.json({ employee })
})

export const create = asyncHandler(async (req, res) => {
  const employee = await Employee.create(req.body)
  res.status(201).json({ employee: await employee.populate(POPULATE) })
})

export const update = asyncHandler(async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate(POPULATE)
  if (!employee) throw httpError(404, 'Employee not found')
  res.json({ employee })
})

// Archive rather than delete — payslips and contracts reference employees forever.
export const archive = asyncHandler(async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true }
  ).populate(POPULATE)
  if (!employee) throw httpError(404, 'Employee not found')
  res.json({ employee })
})
