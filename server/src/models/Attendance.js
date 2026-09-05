import mongoose from 'mongoose'
import { ATTENDANCE_STATUSES } from '../config/constants.js'

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

    // Absent when there is no check in at all.
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },

    workedHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },

    status: { type: String, enum: ATTENDANCE_STATUSES, default: 'present', index: true },

    // The spec wants corrected entries visible as corrections.
    manuallyEdited: { type: Boolean, default: false },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true })

export const Attendance = mongoose.model('Attendance', attendanceSchema)
