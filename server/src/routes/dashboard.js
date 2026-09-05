import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HR_ROLES } from '../config/constants.js'
import { summary } from '../controllers/dashboardController.js'

const router = Router()

router.get('/', requireAuth, requireRole(...HR_ROLES), summary)

export default router
