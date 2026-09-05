import mongoose from 'mongoose'
import { ALLOCATION_MODES, ALLOCATION_STATES } from '../config/constants.js'

const timeOffAllocationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    type: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeOffType', required: true, index: true },

    mode: { type: String, enum: ALLOCATION_MODES, default: 'fixed' },

    // Under accrual this is the ceiling the balance builds up to, not the grant.
    allocated: { type: Number, required: true, min: 0 },

    // Per month, when the mode is accrual.
    accrualRate: { type: Number, default: 0, min: 0 },

    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },

    description: { type: String, trim: true, default: '' },

    // Only an approved allocation creates available balance.
    state: { type: String, enum: ALLOCATION_STATES, default: 'draft', index: true },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

timeOffAllocationSchema.index({ employee: 1, type: 1, validFrom: 1 })

export const TimeOffAllocation = mongoose.model('TimeOffAllocation', timeOffAllocationSchema)
