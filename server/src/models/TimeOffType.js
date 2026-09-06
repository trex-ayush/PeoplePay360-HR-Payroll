import mongoose from 'mongoose'
import { APPROVAL_BY, TIMEOFF_COLORS, TIMEOFF_UNITS } from '../config/constants.js'

const timeOffTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    unit: { type: String, enum: TIMEOFF_UNITS, default: 'days' },

    requiresAllocation: { type: Boolean, default: true },

    // 'manager' narrows approval to the employee's own manager; 'hr' lets any
    // HR user decide.
    approvalBy: { type: String, enum: APPROVAL_BY, default: 'hr' },

    payrollCode: { type: String, trim: true, uppercase: true, default: '' },

    // Only for telling one type from another at a glance on lists and calendars.
    color: { type: String, enum: TIMEOFF_COLORS, default: 'blue' },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const TimeOffType = mongoose.model('TimeOffType', timeOffTypeSchema)
