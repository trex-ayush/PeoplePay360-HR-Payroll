import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { HR_ROLES } from '../config/constants.js'
import * as types from '../controllers/timeOffTypeController.js'
import * as allocations from '../controllers/timeOffAllocationController.js'
import * as requests from '../controllers/timeOffRequestController.js'

const router = Router()
const hr = requireRole(...HR_ROLES)

router.use(requireAuth)

router.get('/types', types.list)
router.get('/types/:id', types.getOne)
router.post('/types', hr, types.create)
router.patch('/types/:id', hr, types.update)
router.delete('/types/:id', hr, types.remove)

router.get('/allocations', allocations.list)
router.get('/allocations/:id', allocations.getOne)
router.post('/allocations', hr, allocations.create)
router.patch('/allocations/:id', hr, allocations.update)
router.post('/allocations/:id/approve', hr, allocations.approve)
router.post('/allocations/:id/refuse', hr, allocations.refuse)
router.delete('/allocations/:id', hr, allocations.remove)

// An employee may raise their own leave; only HR decides on it.
router.get('/requests', requests.list)
router.get('/requests/:id', requests.getOne)
router.post('/requests', requests.create)
router.patch('/requests/:id', requests.update)
router.post('/requests/:id/approve', hr, requests.approve)
router.post('/requests/:id/refuse', hr, requests.refuse)
router.delete('/requests/:id', requests.remove)

export default router
