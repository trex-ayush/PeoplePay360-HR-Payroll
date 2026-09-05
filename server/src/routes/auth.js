import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { login, me, createAdmin } from '../controllers/authController.js'

const router = Router()

router.post('/login', login)
router.get('/me', requireAuth, me)
router.post('/admin', optionalAuth, createAdmin)

export default router
