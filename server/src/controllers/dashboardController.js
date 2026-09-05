import { getDashboard } from '../services/dashboard.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const currentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const summary = asyncHandler(async (req, res) => {
  const { month, department, employeeType } = req.query

  res.json(
    await getDashboard({
      month: /^\d{4}-\d{2}$/.test(month ?? '') ? month : currentMonth(),
      department,
      employeeType,
    })
  )
})
