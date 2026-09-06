// "1 days" reads like a bug, and the mockup writes "1 Day" / "3 Days", so the
// unit drops its s when there is only one of them.
export const inUnits = (value, unit = 'days') =>
  `${value} ${Math.abs(value) === 1 ? unit.replace(/s$/, '') : unit}`
