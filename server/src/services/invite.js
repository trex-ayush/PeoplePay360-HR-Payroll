import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { Invite } from '../models/Invite.js'
import { User } from '../models/User.js'
import { inviteEmail, send } from './mailer.js'
import { signToken } from './auth.js'
import { httpError } from '../utils/asyncHandler.js'

const linkFor = (token) => `${env.clientOrigin}/invite/${token}`

const statusOf = (invite) => {
  if (invite.usedAt) return 'used'
  return invite.expiresAt < new Date() ? 'expired' : 'pending'
}

export const describe = (invite) => ({
  _id: invite._id,
  user: invite.user,
  link: linkFor(invite.token),
  status: statusOf(invite),
  emailSent: invite.emailSent,
  expiresAt: invite.expiresAt,
  usedAt: invite.usedAt,
  createdAt: invite.createdAt,
})

export async function inviteUser(user, actor) {
  if (user.password) throw httpError(409, `${user.email} has already set a password`)

  // One live invite per person, so a forwarded old link stops working.
  await Invite.deleteMany({ user: user._id, usedAt: null })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + env.inviteExpiresInDays)

  const invite = await Invite.create({
    user: user._id,
    token: crypto.randomBytes(32).toString('hex'),
    expiresAt,
    invitedBy: actor?._id ?? null,
  })

  invite.emailSent = await send({
    to: user.email,
    ...inviteEmail({
      name: user.name,
      link: linkFor(invite.token),
      days: env.inviteExpiresInDays,
    }),
  })
  await invite.save()

  return describe(await invite.populate({ path: 'user', select: 'name email roles' }))
}

export async function listInvites({ user } = {}) {
  const filter = {}
  if (user) filter.user = user

  const invites = await Invite.find(filter)
    .populate({ path: 'user', select: 'name email roles' })
    .sort({ createdAt: -1 })

  return { invites: invites.map(describe) }
}

export async function resendInvite(inviteId) {
  const invite = await Invite.findById(inviteId).populate({ path: 'user', select: 'name email roles' })
  if (!invite) throw httpError(404, 'Invite not found')
  if (invite.usedAt) throw httpError(409, 'This invite has already been used')

  // Sending again means giving them a fresh window, not re-mailing a dead link.
  invite.expiresAt = new Date()
  invite.expiresAt.setDate(invite.expiresAt.getDate() + env.inviteExpiresInDays)

  invite.emailSent = await send({
    to: invite.user.email,
    ...inviteEmail({
      name: invite.user.name,
      link: linkFor(invite.token),
      days: env.inviteExpiresInDays,
    }),
  })
  await invite.save()

  return describe(invite)
}

export async function openInvite(token) {
  const invite = await Invite.findOne({ token }).populate({ path: 'user', select: 'name email' })
  if (!invite) throw httpError(404, 'This invite link is not valid')
  if (invite.usedAt) throw httpError(409, 'This link has already been used. Sign in instead.')
  if (invite.expiresAt < new Date()) throw httpError(410, 'This link has expired. Ask HR for a new one.')

  return { name: invite.user.name, email: invite.user.email }
}

export async function acceptInvite(token, password) {
  if (!password || password.length < 8) {
    throw httpError(400, 'Password must be at least 8 characters')
  }

  const invite = await Invite.findOne({ token })
  if (!invite) throw httpError(404, 'This invite link is not valid')
  if (invite.usedAt) throw httpError(409, 'This link has already been used. Sign in instead.')
  if (invite.expiresAt < new Date()) throw httpError(410, 'This link has expired. Ask HR for a new one.')

  const user = await User.findById(invite.user).select('+password')
  if (!user) throw httpError(404, 'The account for this invite no longer exists')

  user.password = password
  await user.save()

  invite.usedAt = new Date()
  await invite.save()

  return { token: signToken(user), user: user.toJSON() }
}
