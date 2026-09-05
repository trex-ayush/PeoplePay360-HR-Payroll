import mongoose from 'mongoose'

const salaryStructureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema)
