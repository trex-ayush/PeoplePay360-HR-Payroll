import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HR_ROLES } from '../config/constants.js'
import { list, getOne, create, update } from '../controllers/scheduleController.js'

const router = Router()
const hr = requireRole(...HR_ROLES)

router.use(requireAuth)

router.get('/', list)
router.get('/:id', getOne)
router.post('/', hr, create)
router.patch('/:id', hr, update)

export default router
