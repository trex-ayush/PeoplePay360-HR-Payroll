import { Attendance } from '../models/Attendance.js'
import { AttendanceCorrection } from '../models/AttendanceCorrection.js'
import { Employee } from '../models/Employee.js'
import { summarise } from '../services/attendance.js'
import { assertOwn, ownFilter } from '../middleware/auth.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

const POPULATE = [
  { path: 'employee', select: 'name code' },
  { path: 'attendance', select: 'date' },
  { path: 'approver', select: 'name' },
]

export const list = asyncHandler(async (req, res) => {
  const { attendance, state } = req.query

  const filter = {}
  if (attendance) filter.attendance = attendance
  if (state) filter.state = state

  const corrections = await AttendanceCorrection.find({ ...filter, ...ownFilter(req) })
    .populate(POPULATE)
    .sort({ createdAt: -1 })

  res.json({ corrections })
})

// An employee cannot edit their own attendance, so this is how they ask for a
// fix. HR still decides, which keeps the record trustworthy.
export const create = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id)
  if (!record) throw httpError(404, 'Attendance record not found')
  assertOwn(req, record.employee)

  const { checkIn, checkOut, reason } = req.body
  if (!reason?.trim()) throw httpError(400, 'Say why this day needs correcting')
  if (!checkIn && !checkOut) throw httpError(400, 'Give at least one corrected time')

  const open = await AttendanceCorrection.findOne({ attendance: record._id, state: 'draft' })
  if (open) throw httpError(409, 'A correction for this day is already waiting for a decision')

  const correction = await AttendanceCorrection.create({
    attendance: record._id,
    employee: record.employee,
    checkIn: checkIn ?? null,
    checkOut: checkOut ?? null,
    reason,
    previousCheckIn: record.checkIn,
    previousCheckOut: record.checkOut,
  })

  res.status(201).json({ correction: await correction.populate(POPULATE) })
})

export const approve = asyncHandler(async (req, res) => {
  const correction = await AttendanceCorrection.findById(req.params.id)
  if (!correction) throw httpError(404, 'Correction not found')
  if (correction.state !== 'draft') throw httpError(409, 'This correction is already decided')

  const record = await Attendance.findById(correction.attendance)
  if (!record) throw httpError(404, 'The attendance record no longer exists')

  const employee = await Employee.findById(record.employee).populate('schedule')

  // A correction states the day as one span, replacing whatever sessions it had.
  const sessions = [
    {
      checkIn: correction.checkIn ?? record.checkIn,
      checkOut: correction.checkOut ?? record.checkOut,
    },
  ]

  Object.assign(record, summarise({ schedule: employee?.schedule, sessions }))
  record.manuallyEdited = true
  await record.save()

  correction.state = 'approved'
  correction.approver = req.user._id
  correction.decidedAt = new Date()
  await correction.save()

  res.json({ correction: await correction.populate(POPULATE), record })
})

export const refuse = asyncHandler(async (req, res) => {
  const correction = await AttendanceCorrection.findById(req.params.id)
  if (!correction) throw httpError(404, 'Correction not found')
  if (correction.state !== 'draft') throw httpError(409, 'This correction is already decided')

  correction.state = 'refused'
  correction.approver = req.user._id
  correction.decidedAt = new Date()
  await correction.save()

  res.json({ correction: await correction.populate(POPULATE) })
})
