import { evaluateFormula } from './formula.js'

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

/**
 * Turns a structure's rules into payslip lines.
 *
 * A pure function — no database, no request. Rules run in sequence order
 * against a shared context keyed by rule code, so each rule can build on the
 * totals produced before it. That ordering is the dependency mechanism: GROSS
 * works because BASIC, HRA and DA already ran and put their values in context.
 */
export function computePayslipLines(rules, { wage, workedDays, totalWorkingDays }) {
  const ordered = [...rules]
    .filter((rule) => rule.active !== false)
    .sort((a, b) => a.sequence - b.sequence)

  const context = {
    WAGE: wage,
    WORKED_DAYS: workedDays,
    TOTAL_WORKING_DAYS: totalWorkingDays,
    // Proration factor — a mid-month joiner earns a part month, not a full one.
    RATIO: totalWorkingDays > 0 ? workedDays / totalWorkingDays : 0,
  }

  const lines = []

  for (const rule of ordered) {
    let amount

    switch (rule.computeType) {
      case 'fixed':
        amount = rule.amount
        break

      case 'percent': {
        const base = context[rule.baseCode]
        if (base === undefined) {
          throw new Error(
            `Rule "${rule.code}" is a percentage of "${rule.baseCode}", which has not been ` +
              `computed yet. Give it a sequence after ${rule.baseCode}.`
          )
        }
        amount = (base * rule.amount) / 100
        break
      }

      case 'formula':
        try {
          amount = evaluateFormula(rule.expression, context)
        } catch (err) {
          throw new Error(`Rule "${rule.code}" ${err.message}`)
        }
        break

      default:
        throw new Error(`Rule "${rule.code}" has an unknown compute type "${rule.computeType}"`)
    }

    amount = round2(amount * (rule.quantity ?? 1))
    context[rule.code] = amount

    lines.push({
      code: rule.code,
      name: rule.name,
      category: rule.category,
      sequence: rule.sequence,
      amount,
    })
  }

  // Totals come from categories rather than hardcoded code names, so a structure
  // that names its rules differently still totals correctly.
  const sumBy = (category) =>
    round2(lines.filter((l) => l.category === category).reduce((t, l) => t + l.amount, 0))

  const gross = context.GROSS ?? round2(sumBy('BASIC') + sumBy('ALW'))
  const deductions = sumBy('DED')
  const net = context.NET ?? round2(gross + deductions)

  return { lines, context, gross: round2(gross), deductions, net: round2(net) }
}
