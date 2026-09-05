import test from 'node:test'
import assert from 'node:assert/strict'
import { accruedOn, assertNotSelf, computeDuration } from './leave.js'

const line = (dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '18:00', breakMinutes: 60 })

const FIVE_DAY = { lines: [0, 1, 2, 3, 4].map(line), weeklyHours: 40, daysPerWeek: 5 }

// 11-Sep-2026 is a Friday, so 14-Sep is the Monday after it.
const FRIDAY = new Date('2026-09-11')
const MONDAY = new Date('2026-09-14')

test('a leave over the weekend only costs its working days', () => {
  assert.equal(computeDuration({ schedule: FIVE_DAY, unit: 'days' }, FRIDAY, MONDAY), 2)
})

test('a single day is one day', () => {
  assert.equal(computeDuration({ schedule: FIVE_DAY, unit: 'days' }, FRIDAY, FRIDAY), 1)
})

test('a weekend-only leave on a weekday schedule costs nothing', () => {
  const saturday = new Date('2026-09-12')
  const sunday = new Date('2026-09-13')
  assert.equal(computeDuration({ schedule: FIVE_DAY, unit: 'days' }, saturday, sunday), 0)
})

test('an hours-unit type converts using the schedule’s hours per working day', () => {
  assert.equal(computeDuration({ schedule: FIVE_DAY, unit: 'hours' }, FRIDAY, MONDAY), 16)
})

test('an employee with no schedule falls back to a Monday–Friday week', () => {
  assert.equal(computeDuration({ schedule: null, unit: 'days' }, FRIDAY, MONDAY), 2)
})

const accrual = (overrides = {}) => ({
  mode: 'accrual',
  accrualRate: 1.5,
  allocated: 18,
  validFrom: new Date('2026-01-01'),
  validTo: new Date('2026-12-31'),
  ...overrides,
})

test('a fixed allocation is available in full from day one', () => {
  assert.equal(
    accruedOn({ mode: 'fixed', allocated: 20 }, new Date('2026-01-01')),
    20
  )
})

test('accrual earns nothing before the first month is complete', () => {
  assert.equal(accruedOn(accrual(), new Date('2026-01-30')), 0)
})

test('accrual lands when the month ends', () => {
  assert.equal(accruedOn(accrual(), new Date('2026-01-31')), 1.5)
})

test('a full Jan–Dec window pays all twelve months', () => {
  assert.equal(accruedOn(accrual({ allocated: 99 }), new Date('2026-12-31')), 18)
})

test('accrual pays out a month at a time', () => {
  assert.equal(accruedOn(accrual(), new Date('2026-02-01')), 1.5)
  assert.equal(accruedOn(accrual(), new Date('2026-03-01')), 3)
  assert.equal(accruedOn(accrual(), new Date('2026-07-01')), 9)
})

test('accrual stops at the ceiling', () => {
  assert.equal(accruedOn(accrual({ accrualRate: 2 }), new Date('2026-12-01')), 18)
})

test('accrual stops accruing once the validity window ends', () => {
  assert.equal(accruedOn(accrual(), new Date('2027-06-01')), 18)
})

const actor = (roles, employeeId) => ({
  employeeId,
  hasRole: (...wanted) => roles.some((r) => wanted.includes(r)),
})

test('an HR user cannot approve their own request', () => {
  assert.throws(
    () => assertNotSelf(actor(['hr_manager'], 'emp1'), 'emp1', 'time off request'),
    /cannot approve your own/
  )
})

test('an HR user can approve somebody else', () => {
  assert.doesNotThrow(() => assertNotSelf(actor(['hr_manager'], 'emp1'), 'emp2', 'allocation'))
})

test('an HR user with no employee record is not blocked', () => {
  assert.doesNotThrow(() => assertNotSelf(actor(['hr_manager'], null), 'emp1', 'allocation'))
})

test('admin stays the escape hatch', () => {
  assert.doesNotThrow(() => assertNotSelf(actor(['admin'], 'emp1'), 'emp1', 'allocation'))
})
