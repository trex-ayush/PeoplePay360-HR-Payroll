import { getDashboard } from '../services/dashboard.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

const DATE = /^\d{4}-\d{2}-\d{2}$/

const startOfMonth = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

const endOfMonth = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
}

// Dates arrive as plain YYYY-MM-DD, which new Date() reads as UTC midnight. The
// range has to cover whole local days, so both ends are built by hand.
const parse = (value, endOfDay) => {
  const [year, month, day] = value.split('-').map(Number)
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59)
    : new Date(year, month - 1, day)
}

export const summary = asyncHandler(async (req, res) => {
  const { from, to, department, employeeType } = req.query

  const start = DATE.test(from ?? '') ? parse(from, false) : startOfMonth()
  const end = DATE.test(to ?? '') ? parse(to, true) : endOfMonth()

  if (end < start) throw httpError(400, 'The end of the period cannot be before its start')

  res.json(await getDashboard({ from: start, to: end, department, employeeType }))
})
