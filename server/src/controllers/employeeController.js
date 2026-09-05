import { Employee } from '../models/Employee.js'
import { Contract } from '../models/Contract.js'
import { User } from '../models/User.js'
import { inviteUser, listInvites } from '../services/invite.js'
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

// Roles on an employee mean "give this person a login", handled in the same step.
async function grantAccess(employee, roles, actor) {
  const existing = await User.findOne({ employeeId: employee._id })
  if (existing) {
    existing.roles = roles
    await existing.save()
    return existing.password ? null : inviteUser(existing, actor)
  }

  if (await User.findOne({ email: employee.workEmail })) {
    throw httpError(409, `An account with ${employee.workEmail} already exists`)
  }

  const user = await User.create({
    name: employee.name,
    email: employee.workEmail,
    roles,
    employeeId: employee._id,
  })

  return inviteUser(user, actor)
}

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
