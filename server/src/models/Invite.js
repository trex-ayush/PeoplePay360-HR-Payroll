import mongoose from 'mongoose'

const inviteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Not hashed on purpose: HR has to read the link back to share it by hand.
    token: { type: String, required: true, unique: true },

    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },

    emailSent: { type: Boolean, default: false },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export const Invite = mongoose.model('Invite', inviteSchema)
