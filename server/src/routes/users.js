import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { list, getOne, available, create, update, invite } from '../controllers/userController.js'

const router = Router()

// Accounts and role assignment are the admin's alone.
router.use(requireAuth, requireRole('admin'))

router.get('/available-employees', available)
router.get('/', list)
router.post('/', create)
router.get('/:id', getOne)
router.patch('/:id', update)
router.post('/:id/invite', invite)

export default router
