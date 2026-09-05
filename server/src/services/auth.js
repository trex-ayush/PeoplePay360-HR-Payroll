import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { Employee } from '../models/Employee.js'
import { httpError } from '../utils/asyncHandler.js'

export function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn })
}

export async function login({ email, password }) {
  if (!email || !password) throw httpError(400, 'Enter your email and password')

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
  if (!user || !(await user.comparePassword(password))) {
    throw httpError(401, 'Email or password is incorrect')
  }
  if (!user.active) throw httpError(403, 'This account has been deactivated')

  return { token: signToken(user), user: user.toJSON() }
}

// The only way an admin comes into existence: either the caller is already an
// admin, or they present ADMIN_SECRET, so nobody can assign themselves a role.
export async function createAdmin({ name, email, password, secret }, actor) {
  if (!actor?.hasRole('admin')) {
    if (actor) throw httpError(403, 'Only an admin can create another admin')
    if (!env.adminSecret) throw httpError(403, 'Admin creation is disabled on this server')
    if (secret !== env.adminSecret) throw httpError(403, 'Admin secret is incorrect')
  }

  if (!name || !email || !password) {
    throw httpError(400, 'Name, email and password are all required')
  }
  if (password.length < 8) {
    throw httpError(400, 'Password must be at least 8 characters')
  }
  if (await User.findOne({ email: email.toLowerCase() })) {
    throw httpError(409, 'An account with that email already exists')
  }

  const user = await User.create({ name, email, password, roles: ['admin'] })

  return { user: user.toJSON() }
}

export async function listUsers() {
  const users = await User.find()
    .select('name email roles employeeId')
    .populate({ path: 'employeeId', select: 'name code' })
    .sort({ name: 1 })

  return { users }
}

// Attendance and "my own records" need to know which employee is signing in, and
// nothing else creates that link.
export async function linkEmployee(userId, employeeId) {
  const employee = await Employee.findById(employeeId)
  if (!employee) throw httpError(404, 'Employee not found')

  const taken = await User.findOne({ employeeId, _id: { $ne: userId } })
  if (taken) throw httpError(409, `${employee.name} is already linked to ${taken.email}`)

  const user = await User.findByIdAndUpdate(userId, { employeeId }, { new: true })
  if (!user) throw httpError(404, 'User not found')

  return { user: user.toJSON() }
}
