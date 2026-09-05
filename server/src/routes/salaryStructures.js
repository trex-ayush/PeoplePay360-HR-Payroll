import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { PAYROLL_CONFIG_ROLES } from '../config/constants.js'
import { list, create, update } from '../controllers/salaryStructureController.js'

const router = Router()

router.use(requireAuth)

router.get('/', list)
router.post('/', requireRole(...PAYROLL_CONFIG_ROLES), create)
router.patch('/:id', requireRole(...PAYROLL_CONFIG_ROLES), update)

export default router
