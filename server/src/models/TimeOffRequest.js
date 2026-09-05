import mongoose from 'mongoose'
import { REQUEST_STATES } from '../config/constants.js'

const timeOffRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    type: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeOffType', required: true, index: true },

    dateFrom: { type: Date, required: true, index: true },
    dateTo: { type: Date, required: true },

    // Working days only, so a leave across a weekend does not cost four days.
    duration: { type: Number, required: true, min: 0 },

    // Set on approval. What the balance covers is paid; the rest is leave without
    // pay, and payroll deducts it.
    paidDuration: { type: Number, default: 0, min: 0 },
    unpaidDuration: { type: Number, default: 0, min: 0 },

    reason: { type: String, trim: true, default: '' },

    allocation: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeOffAllocation', default: null },

    state: { type: String, enum: REQUEST_STATES, default: 'draft', index: true },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export const TimeOffRequest = mongoose.model('TimeOffRequest', timeOffRequestSchema)
