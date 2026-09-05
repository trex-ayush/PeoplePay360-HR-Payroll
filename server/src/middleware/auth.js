import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { HR_ROLES } from '../config/constants.js'
import { User } from '../models/User.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

async function userFromRequest(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null

  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret)
  } catch {
    throw httpError(401, 'Your session has expired. Sign in again.')
  }

  const user = await User.findById(payload.sub)
  if (!user || !user.active) throw httpError(401, 'This account is no longer active')

  return user
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await userFromRequest(req)
  if (!user) throw httpError(401, 'Sign in to continue')

  req.user = user
  next()
})

// Sets req.user when a token is present, but does not demand one.
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  req.user = await userFromRequest(req)
  next()
})

// Admin has full access to all modules, so routes only list the other roles they need.
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (req.user.hasRole('admin', ...roles)) return next()
    next(httpError(403, 'You do not have access to this action'))
  }
}

const isHr = (user) => user.hasRole(...HR_ROLES)

// The spec limits an employee to their own records, so every list they can reach
// is narrowed to them. HR sees everyone and gets no extra filter.
export function ownFilter(req) {
  if (isHr(req.user)) return {}
  if (!req.user.employeeId) {
    throw httpError(403, 'Your account is not linked to an employee record yet')
  }
  return { employee: req.user.employeeId }
}

export function assertOwn(req, employeeId) {
  if (isHr(req.user)) return
  if (String(req.user.employeeId) !== String(employeeId)) {
    throw httpError(403, 'You can only work with your own records')
  }
}
