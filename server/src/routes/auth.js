import { Router } from 'express'
import { requireAuth, optionalAuth, requireRole } from '../middleware/auth.js'
import { login, me, createAdmin, listUsers, linkEmployee } from '../controllers/authController.js'

const router = Router()

router.post('/login', login)
router.get('/me', requireAuth, me)
router.post('/admin', optionalAuth, createAdmin)

router.get('/users', requireAuth, requireRole('admin'), listUsers)
router.patch('/users/:id/employee', requireAuth, requireRole('admin'), linkEmployee)

export default router
