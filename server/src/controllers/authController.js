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
