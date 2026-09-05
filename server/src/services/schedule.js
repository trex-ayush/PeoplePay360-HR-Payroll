const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const DAY_MINUTES = 24 * 60

export function lineHours(line) {
  const start = toMinutes(line.startTime)
  let end = toMinutes(line.endTime)

  // A night shift ends the next morning, so an end at or before the start wraps past midnight.
  if (end <= start) end += DAY_MINUTES

  const span = end - start - (line.breakMinutes || 0)
  return Math.round((Math.max(0, span) / 60) * 100) / 100
}

// The spec requires weekly hours to be derived from the day pattern rather than typed,
// so this is the only place the number is produced.
export function computeWeeklyHours(lines = []) {
  const total = lines
    .filter((line) => line.active !== false)
    .reduce((sum, line) => sum + lineHours(line), 0)
  return Math.round(total * 100) / 100
}

export function workingDayNumbers(lines = []) {
  return [...new Set(lines.filter((l) => l.active !== false).map((l) => l.dayOfWeek))].sort()
}

const MON_TO_FRI = [0, 1, 2, 3, 4]

// Date.getDay() counts from Sunday; schedule lines count from Monday.
const weekdayIndex = (date) => (date.getDay() + 6) % 7

// Both dates inclusive. Payroll uses it for the period denominator, time off for a
// request's duration.
export function workingDaysBetween(schedule, from, to) {
  const days = schedule?.lines?.length ? workingDayNumbers(schedule.lines) : MON_TO_FRI

  let count = 0
  const cursor = new Date(from)
  cursor.setHours(0, 0, 0, 0)
  const last = new Date(to)
  last.setHours(0, 0, 0, 0)

  while (cursor <= last) {
    if (days.includes(weekdayIndex(cursor))) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}
