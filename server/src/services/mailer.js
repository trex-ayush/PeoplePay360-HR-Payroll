import nodemailer from 'nodemailer'
import { env, mailEnabled } from '../config/env.js'

const transport = mailEnabled
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  : null

// Never throws: a dead mail server must not stop an employee from being created.
export async function send({ to, subject, text, html }) {
  if (!transport) return false

  try {
    await transport.sendMail({ from: env.smtp.from, to, subject, text, html })
    return true
  } catch (err) {
    console.error(`Could not email ${to}: ${err.message}`)
    return false
  }
}

export function inviteEmail({ name, link, days }) {
  return {
    subject: 'Set up your PeoplePay360 account',
    text: `Hi ${name},\n\nAn account has been created for you on PeoplePay360.\nSet your password here: ${link}\n\nThe link expires in ${days} days.`,
    html: `<p>Hi ${name},</p>
<p>An account has been created for you on PeoplePay360.</p>
<p><a href="${link}">Set your password</a></p>
<p style="color:#666;font-size:12px">The link expires in ${days} days. If the button does not work, paste this into your browser:<br>${link}</p>`,
  }
}
