import { Attendance } from '../models/Attendance.js'
import { Employee } from '../models/Employee.js'
import { startOfDay, summarise } from '../services/attendance.js'
import { assertOwn, ownFilter } from '../middleware/auth.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'
import { paginate } from '../utils/paginate.js'

const POPULATE = [
  { path: 'employee', select: 'name code department jobPosition', populate: { path: 'department', select: 'name' } },
]

async function scheduleOf(employeeId) {
  const employee = await Employee.findById(employeeId).populate('schedule')
  if (!employee) throw httpError(404, 'Employee not found')
  return employee.schedule
}

// A correction from HR states the day as one span, which replaces whatever
// sessions were there.
const sessionsFrom = (checkIn, checkOut) =>
  checkIn ? [{ checkIn: new Date(checkIn), checkOut: checkOut ? new Date(checkOut) : null }] : []

function ownEmployeeId(req) {
  if (!req.user.employeeId) {
    throw httpError(400, 'Your account is not linked to an employee record yet')
  }
  return req.user.employeeId
}

export const list = asyncHandler(async (req, res) => {
  const { employee, status, from, to, page, pageSize } = req.query

  const filter = {}
  if (employee) filter.employee = employee
  if (status) filter.status = status
  if (from || to) {
    filter.date = {}
    if (from) filter.date.$gte = startOfDay(from)
    if (to) filter.date.$lte = startOfDay(to)
  }

  const { rows, ...meta } = await paginate(Attendance, { ...filter, ...ownFilter(req) }, {
    sort: { date: -1, checkIn: -1 },
    populate: POPULATE,
    page,
    pageSize,
  })

  res.json({ records: rows, ...meta })
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

  const record = (await Attendance.findOne({ employee, date })) ?? new Attendance({ employee, date })
  if (record.sessions.some((s) => !s.checkOut)) {
    throw httpError(409, 'You are already checked in. Check out first.')
  }

  const schedule = await scheduleOf(employee)
  const sessions = [...record.sessions, { checkIn: new Date(), checkOut: null }]

  Object.assign(record, summarise({ schedule, sessions }))
  await record.save()

  res.status(201).json({ record })
})

export const checkOut = asyncHandler(async (req, res) => {
  const employee = ownEmployeeId(req)

  const record = await Attendance.findOne({ employee, date: startOfDay(new Date()) })
  const open = record?.sessions.findLast((s) => !s.checkOut)
  if (!open) throw httpError(400, 'Check in before checking out')

  const schedule = await scheduleOf(employee)
  const sessions = record.sessions.map((s) => (s === open ? { ...s.toObject(), checkOut: new Date() } : s))

  Object.assign(record, summarise({ schedule, sessions }))
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

  const record = await Attendance.create({
    employee,
    date: startOfDay(date ?? checkIn ?? new Date()),
    notes,
    manuallyEdited: true,
    ...summarise({ schedule, sessions: sessionsFrom(checkIn, checkOut) }),
  })

  res.status(201).json({ record: await record.populate(POPULATE) })
})

export const update = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id)
  if (!record) throw httpError(404, 'Attendance record not found')

  const { checkIn, checkOut, ...rest } = req.body
  Object.assign(record, rest)

  const schedule = await scheduleOf(record.employee)
  Object.assign(record, summarise({ schedule, sessions: sessionsFrom(checkIn, checkOut) }))
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
