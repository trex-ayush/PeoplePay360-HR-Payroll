import mongoose from 'mongoose'
import { PAYSLIP_STATES, RULE_CATEGORIES } from '../config/constants.js'

const payslipLineSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, enum: RULE_CATEGORIES, required: true },
    sequence: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
)

// A snapshot, not a view: wage, structure name and line amounts are copied in at
// compute time, so editing a contract or rule later cannot change an issued payslip.
const payslipSchema = new mongoose.Schema(
  {
    payrun: { type: mongoose.Schema.Types.ObjectId, ref: 'Payrun', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    structure: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },

    structureName: { type: String, required: true },
    wage: { type: Number, required: true },

    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    workedDays: { type: Number, required: true },
    totalWorkingDays: { type: Number, required: true },

    lines: { type: [payslipLineSchema], default: [] },

    grossAmount: { type: Number, default: 0 },
    deductionAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },

    state: { type: String, enum: PAYSLIP_STATES, default: 'done', index: true },
    emailedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export const Payslip = mongoose.model('Payslip', payslipSchema)
