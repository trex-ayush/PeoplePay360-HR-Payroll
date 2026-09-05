import { Router } from 'express'
import mongoose from 'mongoose'
import authRoutes from './auth.js'
import employeeRoutes from './employees.js'
import departmentRoutes from './departments.js'
import scheduleRoutes from './schedules.js'
import contractRoutes from './contracts.js'
import salaryStructureRoutes from './salaryStructures.js'
import salaryRuleRoutes from './salaryRules.js'
import payrunRoutes from './payruns.js'
import payslipRoutes from './payslips.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({
    ok: mongoose.connection.readyState === 1,
    service: 'peoplepay360-api',
    uptime: Math.round(process.uptime()),
  })
})

router.use('/auth', authRoutes)
router.use('/employees', employeeRoutes)
router.use('/departments', departmentRoutes)
router.use('/working-schedules', scheduleRoutes)
router.use('/contracts', contractRoutes)
router.use('/salary-structures', salaryStructureRoutes)
router.use('/salary-rules', salaryRuleRoutes)
router.use('/payruns', payrunRoutes)
router.use('/payslips', payslipRoutes)

export default router
