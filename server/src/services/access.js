import { Employee } from '../models/Employee.js'
import { User } from '../models/User.js'
import { inviteUser } from './invite.js'
import { httpError } from '../utils/asyncHandler.js'

// Creating the account and setting its roles is the same operation whether it is
// reached from the employee record or from User Management, so both go through here.
export async function grantAccess(employee, roles, actor) {
  // Nobody assigns or elevates their own roles, admin included — otherwise every
  // role gate in the app is one click away from being lifted.
  if (actor?.employeeId && String(actor.employeeId) === String(employee._id)) {
    throw httpError(403, 'You cannot change the roles on your own account. Ask another admin.')
  }

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

export async function employeeFor(employeeId) {
  const employee = await Employee.findById(employeeId)
  if (!employee) throw httpError(404, 'Employee not found')
  return employee
}
