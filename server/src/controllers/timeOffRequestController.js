import { Employee } from '../models/Employee.js'
import { TimeOffRequest } from '../models/TimeOffRequest.js'
import { TimeOffType } from '../models/TimeOffType.js'
import { computeDuration, findAllocationFor, getBalance, splitDuration } from '../services/leave.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

const POPULATE = [
  { path: 'employee', select: 'name code' },
  { path: 'type', select: 'name unit requiresAllocation' },
  { path: 'approver', select: 'name' },
]

async function durationFor(employeeId, typeId, dateFrom, dateTo) {
  const [employee, type] = await Promise.all([
    Employee.findById(employeeId).populate('schedule'),
    TimeOffType.findById(typeId),
  ])

  if (!employee) throw httpError(404, 'Employee not found')
  if (!type) throw httpError(404, 'Time off type not found')

  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  if (to < from) throw httpError(400, 'The end date cannot be before the start date')

  const duration = computeDuration({ schedule: employee.schedule, unit: type.unit }, from, to)
  if (duration <= 0) {
    throw httpError(400, 'These dates fall entirely outside the employee’s working schedule')
  }

  return { duration, type }
}

export const list = asyncHandler(async (req, res) => {
  const { employee, type, state } = req.query

  const filter = {}
  if (employee) filter.employee = employee
  if (type) filter.type = type
  if (state) filter.state = state

  const requests = await TimeOffRequest.find(filter).populate(POPULATE).sort({ dateFrom: -1 })
  res.json({ requests })
})

export const getOne = asyncHandler(async (req, res) => {
  const request = await TimeOffRequest.findById(req.params.id).populate(POPULATE)
  if (!request) throw httpError(404, 'Time off request not found')

  const allocation = request.type.requiresAllocation
    ? await findAllocationFor(request.employee, request.type, request.dateFrom, request.dateTo)
    : null

  res.json({
    request,
    balance: allocation ? { _id: allocation._id, ...(await getBalance(allocation)) } : null,
  })
})

export const create = asyncHandler(async (req, res) => {
  const { employee, type, dateFrom, dateTo, reason } = req.body

  const { duration } = await durationFor(employee, type, dateFrom, dateTo)

  const request = await TimeOffRequest.create({ employee, type, dateFrom, dateTo, duration, reason })
  res.status(201).json({ request: await request.populate(POPULATE) })
})

export const update = asyncHandler(async (req, res) => {
  const request = await TimeOffRequest.findById(req.params.id)
  if (!request) throw httpError(404, 'Time off request not found')

  if (request.state === 'approved') {
    throw httpError(409, 'Refuse this request before changing its dates')
  }

  Object.assign(request, req.body)
  const { duration } = await durationFor(
    request.employee,
    request.type,
    request.dateFrom,
    request.dateTo
  )
  request.duration = duration
  await request.save()

  res.json({ request: await request.populate(POPULATE) })
})

// R4. Approving is what consumes balance — nothing is decremented here, the
// allocation is only checked and split.
export const approve = asyncHandler(async (req, res) => {
  const request = await TimeOffRequest.findById(req.params.id)
  if (!request) throw httpError(404, 'Time off request not found')
  if (request.state === 'approved') throw httpError(409, 'This request is already approved')

  const type = await TimeOffType.findById(request.type)
  const split = await splitDuration(request, type, req.body?.paidDuration)

  request.state = 'approved'
  request.allocation = split.allocation?._id ?? null
  request.paidDuration = split.paidDuration
  request.unpaidDuration = split.unpaidDuration
  request.approver = req.user._id
  await request.save()

  res.json({ request: await request.populate(POPULATE) })
})

export const refuse = asyncHandler(async (req, res) => {
  const request = await TimeOffRequest.findById(req.params.id)
  if (!request) throw httpError(404, 'Time off request not found')

  request.state = 'refused'
  request.allocation = null
  request.paidDuration = 0
  request.unpaidDuration = 0
  request.approver = req.user._id
  await request.save()

  res.json({ request: await request.populate(POPULATE) })
})

export const remove = asyncHandler(async (req, res) => {
  const request = await TimeOffRequest.findById(req.params.id)
  if (!request) throw httpError(404, 'Time off request not found')

  await request.deleteOne()
  res.json({ deleted: request._id })
})
