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
import * as corrections from '../controllers/attendanceCorrectionController.js'

const router = Router()
const hr = requireRole(...HR_ROLES)

router.use(requireAuth)

// Must sit above /:id, or these are read as record ids.
router.get('/today', today)
router.get('/corrections', corrections.list)
router.post('/corrections/:id/approve', hr, corrections.approve)
router.post('/corrections/:id/refuse', hr, corrections.refuse)
router.post('/check-in', checkIn)
router.post('/check-out', checkOut)

router.get('/', list)
router.get('/:id', getOne)

// The employee asks; only HR decides.
router.post('/:id/corrections', corrections.create)

// Corrections are an HR action, never the employee's own.
router.post('/', hr, create)
router.patch('/:id', hr, update)
router.delete('/:id', hr, remove)

export default router
