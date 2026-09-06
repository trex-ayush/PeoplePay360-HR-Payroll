import mongoose from 'mongoose'
import { REQUEST_STATES } from '../config/constants.js'

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    reason: { type: String, required: true, trim: true },

    // What the record held when the request was raised, so an approver can see
    // what is actually changing without digging through history.
    previousCheckIn: { type: Date, default: null },
    previousCheckOut: { type: Date, default: null },

    state: { type: String, enum: REQUEST_STATES, default: 'draft', index: true },
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export const AttendanceCorrection = mongoose.model(
  'AttendanceCorrection',
  attendanceCorrectionSchema
)
