import test from 'node:test'
import assert from 'node:assert/strict'
import { summarise } from './attendance.js'

// Monday to Friday, 09:00 to 18:00 — a nine hour day at the desk.
const line = (dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '18:00', breakMinutes: 60 })
const OFFICE = { lines: [0, 1, 2, 3, 4].map(line) }

// A night shift that starts on Monday evening and ends Tuesday morning.
const NIGHT = { lines: [{ dayOfWeek: 0, startTime: '21:00', endTime: '06:00', breakMinutes: 30 }] }

const at = (time) => new Date(`2026-09-07T${time}:00`)

test('a normal day is present', () => {
  const { workedHours, overtimeHours, status } = summarise({
    schedule: OFFICE,
    checkIn: at('09:02'),
    checkOut: at('17:05'),
  })

  assert.equal(workedHours, 8.05)
  assert.equal(overtimeHours, 0)
  assert.equal(status, 'present')
})

test('arriving past the grace period is late', () => {
  const { status } = summarise({ schedule: OFFICE, checkIn: at('09:31'), checkOut: at('18:00') })
  assert.equal(status, 'late')
})

test('arriving inside the grace period is not late', () => {
  const { status } = summarise({ schedule: OFFICE, checkIn: at('09:15'), checkOut: at('17:00') })
  assert.equal(status, 'present')
})

test('working past the scheduled hours is overtime', () => {
  const { workedHours, overtimeHours, status } = summarise({
    schedule: OFFICE,
    checkIn: at('09:00'),
    checkOut: at('19:30'),
  })

  assert.equal(workedHours, 10.5)
  assert.equal(overtimeHours, 1.5)
  assert.equal(status, 'overtime')
})

test('overtime is measured against the shift, not a fixed eight hours', () => {
  const { overtimeHours } = summarise({
    schedule: NIGHT,
    checkIn: new Date('2026-09-07T21:00:00'),
    checkOut: new Date('2026-09-08T07:00:00'),
  })

  // The shift spans nine hours, so ten on the clock leaves one of overtime.
  assert.equal(overtimeHours, 1)
})

test('a record with no check in is absent', () => {
  const { workedHours, status } = summarise({ schedule: OFFICE, checkIn: null, checkOut: null })
  assert.equal(workedHours, 0)
  assert.equal(status, 'absent')
})

test('still checked in counts no hours yet', () => {
  const { workedHours, status } = summarise({
    schedule: OFFICE,
    checkIn: at('09:00'),
    checkOut: null,
  })

  assert.equal(workedHours, 0)
  assert.equal(status, 'present')
})

test('an employee with no schedule never reads as late or overtime', () => {
  const { overtimeHours, status } = summarise({
    schedule: null,
    checkIn: at('11:00'),
    checkOut: at('23:00'),
  })

  assert.equal(overtimeHours, 0)
  assert.equal(status, 'present')
})

test('working on a day the schedule does not cover is overtime end to end', () => {
  const saturday = summarise({
    schedule: OFFICE,
    checkIn: new Date('2026-09-12T09:00:00'),
    checkOut: new Date('2026-09-12T21:00:00'),
  })

  assert.equal(saturday.workedHours, 12)
  assert.equal(saturday.overtimeHours, 12)
  assert.equal(saturday.status, 'overtime')
})

test('coming in early on a working day is not late', () => {
  const { status } = summarise({ schedule: OFFICE, checkIn: at('03:00'), checkOut: at('07:00') })
  assert.equal(status, 'present')
})

test('leaving well before the shift ends is a short day', () => {
  const { workedHours, shortHours, status } = summarise({
    schedule: OFFICE,
    checkIn: at('09:00'),
    checkOut: at('13:00'),
  })

  assert.equal(workedHours, 4)
  assert.equal(shortHours, 5)
  assert.equal(status, 'present')
})

test('a few minutes short is not a short day', () => {
  const { shortHours } = summarise({
    schedule: OFFICE,
    checkIn: at('09:00'),
    checkOut: at('17:50'),
  })

  assert.equal(shortHours, 0)
})

test('a rest day is never short, only overtime', () => {
  const { overtimeHours, shortHours } = summarise({
    schedule: OFFICE,
    checkIn: new Date('2026-09-12T09:00:00'),
    checkOut: new Date('2026-09-12T11:00:00'),
  })

  assert.equal(overtimeHours, 2)
  assert.equal(shortHours, 0)
})
