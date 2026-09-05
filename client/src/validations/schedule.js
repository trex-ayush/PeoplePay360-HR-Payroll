import { z } from 'zod'

const timePattern = /^\d{2}:\d{2}$/

export const scheduleSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  type: z.enum(['full_time', 'part_time', 'shift', 'flexible']),
  timezone: z.string().optional(),
  lines: z
    .array(
      z.object({
        dayOfWeek: z.coerce.number().min(0).max(6),
        startTime: z.string().regex(timePattern, 'Use HH:MM'),
        endTime: z.string().regex(timePattern, 'Use HH:MM'),
        breakMinutes: z.coerce.number().min(0),
      })
    )
    .min(1, 'Add at least one day'),
})
