import mongoose from 'mongoose'
import { EMPLOYEE_TYPES } from '../config/constants.js'

const employeeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    workEmail: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },

    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkingSchedule' },

    jobPosition: { type: String, trim: true, default: '' },
    workLocation: { type: String, trim: true, default: '' },
    employeeType: { type: String, enum: EMPLOYEE_TYPES, default: 'full_time' },
    joinedOn: { type: Date, default: null },

    bankAccount: { type: String, trim: true, default: '' },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

employeeSchema.index({ name: 'text', code: 'text', workEmail: 'text' })

export const Employee = mongoose.model('Employee', employeeSchema)
