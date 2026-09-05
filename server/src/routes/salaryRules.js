import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { PAYROLL_ROLES, PAYROLL_CONFIG_ROLES } from '../config/constants.js'
import {
  list,
  getOne,
  create,
  update,
  remove,
  preview,
} from '../controllers/salaryRuleController.js'

const router = Router()
const config = requireRole(...PAYROLL_CONFIG_ROLES)

// HR Payroll User gets read-only access to rules; only the manager may edit.
router.use(requireAuth, requireRole(...PAYROLL_ROLES))

router.get('/', list)
router.get('/preview/:structureId', preview)
router.get('/:id', getOne)
router.post('/', config, create)
router.patch('/:id', config, update)
router.delete('/:id', config, remove)

export default router
