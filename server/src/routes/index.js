import { Router } from 'express'
import mongoose from 'mongoose'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({
    ok: mongoose.connection.readyState === 1,
    service: 'peoplepay360-api',
    uptime: Math.round(process.uptime()),
  })
})

export default router
