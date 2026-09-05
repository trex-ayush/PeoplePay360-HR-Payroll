import test from 'node:test'
import assert from 'node:assert/strict'
import { workingDaysInPeriod } from './payrun.js'

const line = (dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '18:00', breakMinutes: 60 })

const FIVE_DAY = { lines: [0, 1, 2, 3, 4].map(line) }
const FOUR_DAY = { lines: [0, 1, 2, 3].map(line) }

// February 2026 starts on a Sunday and ends on Saturday the 28th.
const FEB = [new Date('2026-02-01'), new Date('2026-02-28')]

test('a five-day schedule counts only weekdays in the period', () => {
  assert.equal(workingDaysInPeriod(FIVE_DAY, ...FEB), 20)
})

test('a four-day schedule prorates differently from a five-day one', () => {
  assert.equal(workingDaysInPeriod(FOUR_DAY, ...FEB), 16)
})

test('a contract with no schedule falls back to Monday–Friday', () => {
  assert.equal(workingDaysInPeriod(null, ...FEB), 20)
  assert.equal(workingDaysInPeriod({ lines: [] }, ...FEB), 20)
})

test('a weekend-only schedule still counts its own days', () => {
  const weekend = { lines: [5, 6].map(line) }
  assert.equal(workingDaysInPeriod(weekend, ...FEB), 8)
})

test('a period of one working day counts one', () => {
  const monday = new Date('2026-02-02')
  assert.equal(workingDaysInPeriod(FIVE_DAY, monday, monday), 1)
})
