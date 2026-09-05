import { Employee } from '../models/Employee.js'
import { Contract } from '../models/Contract.js'
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

// EMP001, EMP002, … — highest existing number plus one, so gaps left by
// archived employees are never reused.
async function nextEmployeeCode() {
  const existing = await Employee.find({ code: /^EMP\d+$/ }).select('code').lean()
  const highest = existing.reduce((max, e) => Math.max(max, Number(e.code.slice(3)) || 0), 0)
  return `EMP${String(highest + 1).padStart(3, '0')}`
}

export const nextCode = asyncHandler(async (_req, res) => {
  res.json({ code: await nextEmployeeCode() })
})

export const create = asyncHandler(async (req, res) => {
  const code = req.body.code?.trim() || (await nextEmployeeCode())
  const employee = await Employee.create({ ...req.body, code })
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

export const remove = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
  if (!employee) throw httpError(404, 'Employee not found')

  const contracts = await Contract.countDocuments({ employee: employee._id })
  if (contracts) {
    throw httpError(
      409,
      `${contracts} contract${contracts > 1 ? 's are' : ' is'} attached to ${employee.name}. ` +
        `Delete them first.`
    )
  }

  // Manager is an optional pointer, so reports simply lose it rather than
  // blocking the delete the way a contract does.
  const { modifiedCount } = await Employee.updateMany(
    { manager: employee._id },
    { $set: { manager: null } }
  )

  await employee.deleteOne()
  res.json({ deleted: employee.name, managerCleared: modifiedCount })
})
