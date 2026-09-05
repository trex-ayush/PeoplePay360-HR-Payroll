import mongoose from 'mongoose'
import { EMPLOYEE_TYPES, PAYRUN_STATES } from '../config/constants.js'

const payrunSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    structure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryStructure',
      required: true,
    },

    // The wizard's scope filter, kept so the batch can explain who it covered.
    employeeTypes: { type: [String], enum: EMPLOYEE_TYPES, default: [] },

    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    // Only the employees ticked in wizard step 2 — the batch never widens later.
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],

    state: { type: String, enum: PAYRUN_STATES, default: 'draft', index: true },
  },
  { timestamps: true }
)

payrunSchema.index({ periodStart: -1 })

export const Payrun = mongoose.model('Payrun', payrunSchema)
