import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { PAYROLL_ROLES } from '../config/constants.js'
import { list, getOne } from '../controllers/payslipController.js'

const router = Router()

router.use(requireAuth, requireRole(...PAYROLL_ROLES))

router.get('/', list)
router.get('/:id', getOne)

export default router
