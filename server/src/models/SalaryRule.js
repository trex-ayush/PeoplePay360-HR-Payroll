import mongoose from 'mongoose'
import { RULE_CATEGORIES, COMPUTE_TYPES } from '../config/constants.js'

const salaryRuleSchema = new mongoose.Schema(
  {
    structure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryStructure',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    category: { type: String, enum: RULE_CATEGORIES, required: true },

    // Rules run in this order. A later rule may reference any code above it.
    sequence: { type: Number, required: true, default: 10 },

    computeType: { type: String, enum: COMPUTE_TYPES, default: 'fixed' },
    amount: { type: Number, default: 0 },
    baseCode: { type: String, trim: true, uppercase: true, default: '' },
    expression: { type: String, trim: true, default: '' },

    quantity: { type: Number, default: 1 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

salaryRuleSchema.index({ structure: 1, sequence: 1 })
salaryRuleSchema.index({ structure: 1, code: 1 }, { unique: true })

export const SalaryRule = mongoose.model('SalaryRule', salaryRuleSchema)
