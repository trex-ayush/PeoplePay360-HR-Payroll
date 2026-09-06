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

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
    .format(value ?? 0)

const day = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export function payslipEmail({ payslip, link }) {
  const period = `${day(payslip.periodStart)} — ${day(payslip.periodEnd)}`

  const rows = payslip.lines
    .map(
      (line) =>
        `<tr><td style="padding:4px 12px 4px 0">${line.name}</td>` +
        `<td style="padding:4px 0;text-align:right">${money(line.amount)}</td></tr>`
    )
    .join('')

  return {
    subject: `Payslip for ${period}`,
    text:
      `Your payslip for ${period} is ready.

` +
      `Worked days: ${payslip.workedDays} of ${payslip.totalWorkingDays}
` +
      `Net salary: ${money(payslip.netAmount)}

` +
      `Open it here: ${link}`,
    html: `<p>Your payslip for <strong>${period}</strong> is ready.</p>
<table style="border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding:8px 12px 0 0;border-top:1px solid #ccc"><strong>Net Salary</strong></td>
<td style="padding:8px 0 0;text-align:right;border-top:1px solid #ccc"><strong>${money(payslip.netAmount)}</strong></td></tr></table>
<p style="color:#666;font-size:12px">Worked ${payslip.workedDays} of ${payslip.totalWorkingDays} days.</p>
<p><a href="${link}">Open the full payslip</a></p>`,
  }
}
