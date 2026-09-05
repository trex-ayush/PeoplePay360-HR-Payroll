import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HR_ROLES } from '../config/constants.js'
import {
  list,
  getOne,
  create,
  update,
  nextReference,
  remove,
} from '../controllers/contractController.js'

const router = Router()
const hr = requireRole(...HR_ROLES)

router.use(requireAuth, hr)

// Must sit above /:id, or "next-reference" is read as a contract id.
router.get('/next-reference', nextReference)

router.get('/', list)
router.get('/:id', getOne)
router.post('/', create)
router.patch('/:id', update)
router.delete('/:id', remove)

export default router
