import { Attendance } from '../models/Attendance.js'
import { Employee } from '../models/Employee.js'
import { startOfDay, summarise } from '../services/attendance.js'
import { assertOwn, ownFilter } from '../middleware/auth.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

const POPULATE = [
  { path: 'employee', select: 'name code department jobPosition', populate: { path: 'department', select: 'name' } },
]

async function scheduleOf(employeeId) {
  const employee = await Employee.findById(employeeId).populate('schedule')
  if (!employee) throw httpError(404, 'Employee not found')
  return employee.schedule
}

function ownEmployeeId(req) {
  if (!req.user.employeeId) {
    throw httpError(400, 'Your account is not linked to an employee record yet')
  }
  return req.user.employeeId
}

export const list = asyncHandler(async (req, res) => {
  const { employee, status, from, to } = req.query

  const filter = {}
  if (employee) filter.employee = employee
  if (status) filter.status = status
  if (from || to) {
    filter.date = {}
    if (from) filter.date.$gte = startOfDay(from)
    if (to) filter.date.$lte = startOfDay(to)
  }

  const records = await Attendance.find({ ...filter, ...ownFilter(req) })
    .populate(POPULATE)
    .sort({ date: -1, checkIn: -1 })
  res.json({ records })
})

// Feeds the home widget: what the signed-in employee has done today.
export const today = asyncHandler(async (req, res) => {
  if (!req.user.employeeId) return res.json({ record: null, linked: false })

  const record = await Attendance.findOne({
    employee: req.user.employeeId,
    date: startOfDay(new Date()),
  })

  res.json({ record, linked: true })
})

export const checkIn = asyncHandler(async (req, res) => {
  const employee = ownEmployeeId(req)
  const date = startOfDay(new Date())

  const existing = await Attendance.findOne({ employee, date })
  if (existing?.checkIn) throw httpError(409, 'You have already checked in today')

  const now = new Date()
  const schedule = await scheduleOf(employee)
  const derived = summarise({ schedule, checkIn: now, checkOut: null })

  const record = existing ?? new Attendance({ employee, date })
  Object.assign(record, { checkIn: now, checkOut: null, ...derived })
  await record.save()

  res.status(201).json({ record })
})

export const checkOut = asyncHandler(async (req, res) => {
  const employee = ownEmployeeId(req)

  const record = await Attendance.findOne({ employee, date: startOfDay(new Date()) })
  if (!record?.checkIn) throw httpError(400, 'Check in before checking out')
  if (record.checkOut) throw httpError(409, 'You have already checked out today')

  const now = new Date()
  const schedule = await scheduleOf(employee)

  Object.assign(record, {
    checkOut: now,
    ...summarise({ schedule, checkIn: record.checkIn, checkOut: now }),
  })
  await record.save()

  res.json({ record })
})

export const getOne = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id).populate(POPULATE)
  if (!record) throw httpError(404, 'Attendance record not found')
  assertOwn(req, record.employee._id)

  res.json({ record })
})

export const create = asyncHandler(async (req, res) => {
  const { employee, date, checkIn, checkOut, notes } = req.body

  const schedule = await scheduleOf(employee)
  const derived = summarise({
    schedule,
    checkIn: checkIn ? new Date(checkIn) : null,
    checkOut: checkOut ? new Date(checkOut) : null,
  })

  const record = await Attendance.create({
    employee,
    date: startOfDay(date ?? checkIn ?? new Date()),
    checkIn: checkIn ?? null,
    checkOut: checkOut ?? null,
    notes,
    manuallyEdited: true,
    ...derived,
  })

  res.status(201).json({ record: await record.populate(POPULATE) })
})

export const update = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id)
  if (!record) throw httpError(404, 'Attendance record not found')

  Object.assign(record, req.body)

  const schedule = await scheduleOf(record.employee)
  Object.assign(
    record,
    summarise({ schedule, checkIn: record.checkIn, checkOut: record.checkOut })
  )
  record.manuallyEdited = true
  await record.save()

  res.json({ record: await record.populate(POPULATE) })
})

export const remove = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id)
  if (!record) throw httpError(404, 'Attendance record not found')

  await record.deleteOne()
  res.json({ deleted: record._id })
})
