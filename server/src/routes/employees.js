import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HR_ROLES } from '../config/constants.js'
import {
  list,
  getOne,
  create,
  update,
  remove,
  nextCode,
  access,
  related,
  grant,
} from '../controllers/employeeController.js'

const router = Router()
const hr = requireRole(...HR_ROLES)

router.use(requireAuth, hr)

// Must sit above /:id, or "next-code" is read as an employee id.
router.get('/next-code', nextCode)

router.get('/', list)
router.get('/:id', getOne)
router.post('/', create)
router.get('/:id/related', related)
router.get('/:id/access', access)
router.post('/:id/access', grant)

router.patch('/:id', update)
router.delete('/:id', remove)

export default router
