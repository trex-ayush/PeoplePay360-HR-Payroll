import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HR_ROLES } from '../config/constants.js'
import { list, create, update } from '../controllers/departmentController.js'

const router = Router()
const hr = requireRole(...HR_ROLES)

router.use(requireAuth)

router.get('/', list)
router.post('/', hr, create)
router.patch('/:id', hr, update)

export default router
