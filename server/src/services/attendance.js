import { HOURS_GRACE_MINUTES, LATE_GRACE_MINUTES } from '../config/constants.js'
import { lineHours } from './schedule.js'

const round2 = (n) => Math.round(n * 100) / 100

const MS_PER_HOUR = 60 * 60 * 1000

export const startOfDay = (value) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const weekdayIndex = (date) => (date.getDay() + 6) % 7

const minutesOfDay = (date) => date.getHours() * 60 + date.getMinutes()

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function scheduleLineFor(schedule, date) {
  const day = weekdayIndex(date)
  return schedule?.lines?.find((line) => line.dayOfWeek === day && line.active !== false) ?? null
}

// Read off the employee's own schedule rather than a fixed nine-to-five: a night
// shift or a four-day week has a different idea of late and of overtime.
//
// A day can hold several sessions — out for lunch, back after — so worked hours
// are the sum of the closed ones, while checkIn/checkOut collapse to the first
// arrival and the last departure for the plain two-column views.
export function summarise({ schedule, sessions = [] }) {
  const ordered = [...sessions]
    .filter((s) => s.checkIn)
    .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))

  if (!ordered.length) {
    return {
      sessions: [],
      checkIn: null,
      checkOut: null,
      workedHours: 0,
      overtimeHours: 0,
      shortHours: 0,
      status: 'absent',
    }
  }

  const first = new Date(ordered[0].checkIn)
  const open = ordered.some((s) => !s.checkOut)
  const last = open ? null : new Date(ordered[ordered.length - 1].checkOut)

  const workedHours = round2(
    ordered
      .filter((s) => s.checkOut)
      .reduce((total, s) => total + (new Date(s.checkOut) - new Date(s.checkIn)) / MS_PER_HOUR, 0)
  )

  const line = scheduleLineFor(schedule, first)
  const scheduled = Boolean(schedule?.lines?.length)

  // Somebody who clocks out for lunch has already excluded their break, so they
  // are measured against paid hours. Somebody who stayed clocked in all day has
  // the break still inside their total, so the shift's whole clock span is used.
  // Without this the diligent one looks short and the other one looks fine.
  const unclockedBreak = ordered.length > 1 ? 0 : (line?.breakMinutes || 0) / 60
  const expected = line ? lineHours(line) + unclockedBreak : 0

  // A few minutes either way is noise, not an exception worth flagging.
  const beyondGrace = (hours) => (hours * 60 > HOURS_GRACE_MINUTES ? hours : 0)

  // A day the schedule does not cover at all is overtime end to end and gets no
  // grace. With no schedule at all there is nothing to judge against.
  const overtimeHours = line
    ? beyondGrace(round2(Math.max(0, workedHours - expected)))
    : scheduled
      ? workedHours
      : 0

  const shortHours = line ? beyondGrace(round2(Math.max(0, expected - workedHours))) : 0

  const late = line ? minutesOfDay(first) > toMinutes(line.startTime) + LATE_GRACE_MINUTES : false

  // Still at the desk: only the arrival can be judged yet.
  if (open) {
    return {
      sessions: ordered,
      checkIn: first,
      checkOut: null,
      workedHours,
      overtimeHours: 0,
      shortHours: 0,
      status: late ? 'late' : 'present',
    }
  }

  return {
    sessions: ordered,
    checkIn: first,
    checkOut: last,
    workedHours,
    overtimeHours,
    shortHours,
    status: late ? 'late' : overtimeHours > 0 ? 'overtime' : 'present',
  }
}
