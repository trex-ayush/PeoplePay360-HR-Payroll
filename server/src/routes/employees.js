import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HR_ROLES } from '../config/constants.js'
import { list, getOne, create, update, archive } from '../controllers/employeeController.js'

const router = Router()
const hr = requireRole(...HR_ROLES)

router.use(requireAuth)

router.get('/', hr, list)
router.get('/:id', hr, getOne)
router.post('/', hr, create)
router.patch('/:id', hr, update)
router.delete('/:id', hr, archive)

export default router
