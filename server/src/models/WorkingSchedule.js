import mongoose from 'mongoose'
import { computeWeeklyHours, workingDayNumbers } from '../services/schedule.js'
import { SCHEDULE_TYPES } from '../config/constants.js'

const scheduleLineSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    breakMinutes: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: false }
)

const workingScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: SCHEDULE_TYPES, default: 'full_time' },
    lines: { type: [scheduleLineSchema], default: [] },
    weeklyHours: { type: Number, default: 0 },
    daysPerWeek: { type: Number, default: 0 },
    timezone: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

workingScheduleSchema.pre('validate', function (next) {
  this.weeklyHours = computeWeeklyHours(this.lines)
  this.daysPerWeek = workingDayNumbers(this.lines).length
  next()
})

export const WorkingSchedule = mongoose.model('WorkingSchedule', workingScheduleSchema)
