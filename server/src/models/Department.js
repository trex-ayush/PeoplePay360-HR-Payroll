import mongoose from 'mongoose'

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const Department = mongoose.model('Department', departmentSchema)
