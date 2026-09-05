import * as authService from '../services/auth.js'
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
