import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { ROLES } from '../config/constants.js'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Empty until an invited person sets it through their link.
    password: { type: String, minlength: 8, select: false },
    roles: {
      type: [{ type: String, enum: ROLES }],
      default: ['employee'],
      validate: [(v) => v.length > 0, 'A user needs at least one role'],
    },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

userSchema.methods.hasRole = function (...roles) {
  return this.roles.some((role) => roles.includes(role))
}

// second guard behind select:false — a populated or lean-bypassing read must never leak the hash
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password
    delete ret.__v
    return ret
  },
})

export const User = mongoose.model('User', userSchema)
