import mongoose from 'mongoose'
import { CONTRACT_STATES } from '../config/constants.js'

const contractSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, trim: true },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    structure: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },
    schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkingSchedule' },

    jobPosition: { type: String, trim: true, default: '' },
    wage: { type: Number, required: true, min: 0 },

    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null, index: true },

    notes: { type: String, trim: true, default: '' },
    state: { type: String, enum: CONTRACT_STATES, default: 'draft', index: true },
  },
  { timestamps: true }
)

contractSchema.index({ employee: 1, startDate: 1 })

export const Contract = mongoose.model('Contract', contractSchema)
