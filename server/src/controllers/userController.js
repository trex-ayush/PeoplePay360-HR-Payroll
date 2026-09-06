import { Employee } from '../models/Employee.js'
import { User } from '../models/User.js'
import { grantAccess, employeeFor } from '../services/access.js'
import { inviteUser, listInvites } from '../services/invite.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'
import { paginate } from '../utils/paginate.js'

const POPULATE = [{ path: 'employeeId', select: 'name code jobPosition department' }]

export const list = asyncHandler(async (req, res) => {
  const { search, role, active, page, pageSize } = req.query

  const filter = {}
  if (role) filter.roles = role
  if (active === 'true' || active === 'false') filter.active = active === 'true'
  if (search) {
    filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }]
  }

  const { rows, ...meta } = await paginate(User, filter, {
    sort: { name: 1 },
    populate: POPULATE,
    page,
    pageSize,
  })

  res.json({ users: rows, ...meta })
})

export const getOne = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate(POPULATE)
  if (!user) throw httpError(404, 'User not found')

  const { invites } = await listInvites({ user: user._id })
  res.json({ user, invites })
})

// Employees who can still be given an account, so the picker never offers a
// person who already has one.
export const available = asyncHandler(async (req, res) => {
  const taken = await User.find({ employeeId: { $ne: null } }).select('employeeId').lean()

  const employees = await Employee.find({
    active: true,
    _id: { $nin: taken.map((user) => user.employeeId) },
  })
    .select('name code workEmail jobPosition')
    .sort({ name: 1 })

  res.json({ employees })
})

export const create = asyncHandler(async (req, res) => {
  const { employee: employeeId, roles } = req.body
  if (!employeeId) throw httpError(400, 'Pick the employee this account belongs to')
  if (!roles?.length) throw httpError(400, 'Pick at least one role for this account')

  const employee = await employeeFor(employeeId)
  const invite = await grantAccess(employee, roles, req.user)

  const user = await User.findOne({ employeeId: employee._id }).populate(POPULATE)
  res.status(201).json({ user, invite })
})

export const update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw httpError(404, 'User not found')

  // The same rule as granting access: an admin cannot rewrite their own roles or
  // switch their own account off.
  if (String(user._id) === String(req.user._id)) {
    throw httpError(403, 'You cannot change your own account. Ask another admin.')
  }

  const { roles, active } = req.body
  if (roles) {
    if (!roles.length) throw httpError(400, 'A user needs at least one role')
    user.roles = roles
  }
  if (active !== undefined) user.active = active

  await user.save()
  res.json({ user: await user.populate(POPULATE) })
})

export const invite = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) throw httpError(404, 'User not found')

  res.status(201).json({ invite: await inviteUser(user, req.user) })
})
