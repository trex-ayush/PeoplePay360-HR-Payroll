import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { PAYROLL_ROLES } from '../config/constants.js'
import {
  list,
  getOne,
  create,
  compute,
  validate,
  markPaid,
  remove,
  eligibleEmployees,
} from '../controllers/payrunController.js'

const router = Router()

router.use(requireAuth, requireRole(...PAYROLL_ROLES))

// Must sit above /:id, or "eligible-employees" is read as a payrun id.
router.get('/eligible-employees', eligibleEmployees)

router.get('/', list)
router.get('/:id', getOne)
router.post('/', create)
router.post('/:id/compute', compute)
router.post('/:id/validate', validate)
router.post('/:id/mark-paid', markPaid)
router.delete('/:id', remove)

export default router
