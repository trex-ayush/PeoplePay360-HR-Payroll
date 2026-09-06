import mongoose from 'mongoose'
import { ATTENDANCE_STATUSES } from '../config/constants.js'

const sessionSchema = new mongoose.Schema(
  {
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, default: null },
  },
  { _id: false }
)

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },

    // Midnight of the day this record belongs to, so one employee has at most
    // one record per day regardless of shift times.
    date: { type: Date, required: true, index: true },

    // One day can hold several spells at the desk — out for lunch, back after.
    sessions: { type: [sessionSchema], default: [] },

    // First check in and last check out of the day, derived from the sessions so
    // lists and payslips have the plain two-column view the spec asks for.
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },

    workedHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    shortHours: { type: Number, default: 0 },

    status: { type: String, enum: ATTENDANCE_STATUSES, default: 'present', index: true },

    // The spec wants corrected entries visible as corrections.
    manuallyEdited: { type: Boolean, default: false },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true })

export const Attendance = mongoose.model('Attendance', attendanceSchema)
