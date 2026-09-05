import { Router } from 'express'
import { requireAuth, optionalAuth, requireRole } from '../middleware/auth.js'
import { HR_ROLES } from '../config/constants.js'
import {
  login,
  me,
  createAdmin,
  listUsers,
  linkEmployee,
  listInvites,
  resendInvite,
  openInvite,
  acceptInvite,
} from '../controllers/authController.js'

const router = Router()

router.post('/login', login)
router.get('/me', requireAuth, me)
router.post('/admin', optionalAuth, createAdmin)

// Anyone holding a valid link can open it — that is the point of the link.
router.get('/invites/:token', openInvite)
router.post('/invites/:token/accept', acceptInvite)

router.get('/users', requireAuth, requireRole('admin'), listUsers)
router.patch('/users/:id/employee', requireAuth, requireRole('admin'), linkEmployee)

router.get('/invites', requireAuth, requireRole(...HR_ROLES), listInvites)
router.post('/invites/:id/resend', requireAuth, requireRole(...HR_ROLES), resendInvite)

export default router
