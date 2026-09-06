import { Employee } from '../models/Employee.js'
import { Contract } from '../models/Contract.js'
import { Attendance } from '../models/Attendance.js'
import { TimeOffRequest } from '../models/TimeOffRequest.js'
import { TimeOffAllocation } from '../models/TimeOffAllocation.js'
import { User } from '../models/User.js'
import { listInvites } from '../services/invite.js'
import { grantAccess } from '../services/access.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'
import { paginate } from '../utils/paginate.js'

const POPULATE = [
  { path: 'department', select: 'name' },
  { path: 'manager', select: 'name code' },
  { path: 'schedule', select: 'name weeklyHours' },
]

export const list = asyncHandler(async (req, res) => {
  const { search, department, employeeType, active, page, pageSize } = req.query

  const filter = {}
  if (active !== 'all') filter.active = true
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

  const { rows, ...meta } = await paginate(Employee, filter, {
    sort: { name: 1 },
    populate: POPULATE,
    page,
    pageSize,
  })

  res.json({ employees: rows, ...meta })
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

// Feeds the counts on the employee form's smart buttons.
export const related = asyncHandler(async (req, res) => {
  const employee = { employee: req.params.id }

  const [contracts, attendance, timeOff, allocations] = await Promise.all([
    Contract.countDocuments(employee),
    Attendance.countDocuments(employee),
    TimeOffRequest.countDocuments(employee),
    TimeOffAllocation.countDocuments(employee),
  ])

  res.json({ contracts, attendance, timeOff, allocations })
})

export const nextCode = asyncHandler(async (_req, res) => {
  res.json({ code: await nextEmployeeCode() })
})

// Roles on an employee mean "give this person a login", handled in the same step.
export const create = asyncHandler(async (req, res) => {
  const { roles, ...fields } = req.body

  const code = fields.code?.trim() || (await nextEmployeeCode())
  const employee = await Employee.create({ ...fields, code })

  const invite = roles?.length ? await grantAccess(employee, roles, req.user) : null

  res.status(201).json({ employee: await employee.populate(POPULATE), invite })
})

export const access = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
  if (!employee) throw httpError(404, 'Employee not found')

  const user = await User.findOne({ employeeId: employee._id })
  if (!user) return res.json({ user: null, invites: [] })

  const { invites } = await listInvites({ user: user._id })
  res.json({ user, invites })
})

export const grant = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
  if (!employee) throw httpError(404, 'Employee not found')

  const roles = req.body.roles
  if (!roles?.length) throw httpError(400, 'Pick at least one role for this account')

  const invite = await grantAccess(employee, roles, req.user)
  res.status(201).json({ invite })
})

export const update = asyncHandler(async (req, res) => {
  const { roles, ...fields } = req.body

  const employee = await Employee.findByIdAndUpdate(req.params.id, fields, {
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

  // Same reasoning for the login: it stops pointing anywhere rather than blocking.
  const login = await User.updateMany({ employeeId: employee._id }, { $set: { employeeId: null } })

  await employee.deleteOne()
  res.json({
    deleted: employee.name,
    managerCleared: modifiedCount,
    loginUnlinked: login.modifiedCount,
  })
})
