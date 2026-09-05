import * as authService from '../services/auth.js'
import * as inviteService from '../services/invite.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const login = asyncHandler(async (req, res) => {
  res.json(await authService.login(req.body))
})

export const me = (req, res) => {
  res.json({ user: req.user.toJSON() })
}

export const createAdmin = asyncHandler(async (req, res) => {
  res.status(201).json(await authService.createAdmin(req.body, req.user))
})


export const listUsers = asyncHandler(async (_req, res) => {
  res.json(await authService.listUsers())
})

export const linkEmployee = asyncHandler(async (req, res) => {
  res.json(await authService.linkEmployee(req.params.id, req.body.employeeId))
})

export const listInvites = asyncHandler(async (_req, res) => {
  res.json(await inviteService.listInvites())
})

export const resendInvite = asyncHandler(async (req, res) => {
  res.json({ invite: await inviteService.resendInvite(req.params.id) })
})

export const openInvite = asyncHandler(async (req, res) => {
  res.json(await inviteService.openInvite(req.params.token))
})

export const acceptInvite = asyncHandler(async (req, res) => {
  res.json(await inviteService.acceptInvite(req.params.token, req.body.password))
})
