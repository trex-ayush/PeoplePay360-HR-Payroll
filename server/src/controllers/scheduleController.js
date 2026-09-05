import { WorkingSchedule } from '../models/WorkingSchedule.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

// weeklyHours and daysPerWeek are derived, so a value sent by the client is ignored.
const stripDerived = ({ weeklyHours, daysPerWeek, ...rest }) => rest

export const list = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.active !== 'all') filter.active = true
  if (req.query.search) filter.name = new RegExp(req.query.search, 'i')

  res.json({ schedules: await WorkingSchedule.find(filter).sort({ name: 1 }) })
})

export const getOne = asyncHandler(async (req, res) => {
  const schedule = await WorkingSchedule.findById(req.params.id)
  if (!schedule) throw httpError(404, 'Working schedule not found')
  res.json({ schedule })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ schedule: await WorkingSchedule.create(stripDerived(req.body)) })
})

export const update = asyncHandler(async (req, res) => {
  const schedule = await WorkingSchedule.findById(req.params.id)
  if (!schedule) throw httpError(404, 'Working schedule not found')

  Object.assign(schedule, stripDerived(req.body))
  await schedule.save()

  res.json({ schedule })
})
