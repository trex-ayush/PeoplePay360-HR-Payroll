import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HR_ROLES } from '../config/constants.js'
import {
  list,
  today,
  checkIn,
  checkOut,
  getOne,
  create,
  update,
  remove,
} from '../controllers/attendanceController.js'

const router = Router()
const hr = requireRole(...HR_ROLES)

router.use(requireAuth)

// Must sit above /:id, or "today" is read as a record id.
router.get('/today', today)
router.post('/check-in', checkIn)
router.post('/check-out', checkOut)

router.get('/', list)
router.get('/:id', getOne)

// Corrections are an HR action, never the employee's own.
router.post('/', hr, create)
router.patch('/:id', hr, update)
router.delete('/:id', hr, remove)

export default router
