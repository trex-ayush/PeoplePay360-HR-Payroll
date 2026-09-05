import mongoose from 'mongoose'
import { TIMEOFF_UNITS } from '../config/constants.js'

const timeOffTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    unit: { type: String, enum: TIMEOFF_UNITS, default: 'days' },

    requiresAllocation: { type: Boolean, default: true },

    payrollCode: { type: String, trim: true, uppercase: true, default: '' },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const TimeOffType = mongoose.model('TimeOffType', timeOffTypeSchema)
