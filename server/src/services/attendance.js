import { LATE_GRACE_MINUTES, SHORT_DAY_GRACE_MINUTES } from '../config/constants.js'
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
export function summarise({ schedule, checkIn, checkOut }) {
  if (!checkIn) return { workedHours: 0, overtimeHours: 0, shortHours: 0, status: 'absent' }

  const workedHours = checkOut ? round2((checkOut - checkIn) / MS_PER_HOUR) : 0
  const line = scheduleLineFor(schedule, checkIn)
  const scheduled = Boolean(schedule?.lines?.length)

  // Worked hours are clock time, so overtime compares against the shift's clock
  // span too. lineHours() nets out the break, which is added back here.
  const expected = line ? lineHours(line) + (line.breakMinutes || 0) / 60 : 0

  // A day the schedule does not cover at all is overtime end to end. Without any
  // schedule there is nothing to judge against, so nothing is counted.
  const overtimeHours = line
    ? round2(Math.max(0, workedHours - expected))
    : scheduled
      ? workedHours
      : 0
  // The other side of overtime: hours the shift expected but did not get.
  const shortfall = line ? round2(Math.max(0, expected - workedHours)) : 0
  const shortHours = shortfall * 60 > SHORT_DAY_GRACE_MINUTES ? shortfall : 0

  const late = line ? minutesOfDay(checkIn) > toMinutes(line.startTime) + LATE_GRACE_MINUTES : false

  // Still checked in: nothing to judge yet beyond having turned up.
  if (!checkOut) {
    return { workedHours: 0, overtimeHours: 0, shortHours: 0, status: late ? 'late' : 'present' }
  }

  return {
    workedHours,
    overtimeHours,
    shortHours,
    status: late ? 'late' : overtimeHours > 0 ? 'overtime' : 'present',
  }
}
