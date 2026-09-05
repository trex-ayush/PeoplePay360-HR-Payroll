import test from 'node:test'
import assert from 'node:assert/strict'
import { computePayslipLines } from './payroll.js'
import { evaluateFormula } from './formula.js'

const REGULAR = [
  { sequence: 10, code: 'BASIC', name: 'Basic Salary', category: 'BASIC', computeType: 'formula', expression: 'WAGE * RATIO' },
  { sequence: 20, code: 'HRA', name: 'House Rent Allowance', category: 'ALW', computeType: 'percent', baseCode: 'BASIC', amount: 40 },
  { sequence: 30, code: 'DA', name: 'Dearness Allowance', category: 'ALW', computeType: 'percent', baseCode: 'BASIC', amount: 10 },
  { sequence: 40, code: 'GROSS', name: 'Gross Salary', category: 'GROSS', computeType: 'formula', expression: 'BASIC + HRA + DA' },
  { sequence: 50, code: 'PF', name: 'Provident Fund', category: 'DED', computeType: 'percent', baseCode: 'BASIC', amount: -12 },
  { sequence: 60, code: 'PT', name: 'Professional Tax', category: 'DED', computeType: 'fixed', amount: -200 },
  { sequence: 70, code: 'NET', name: 'Net Salary', category: 'NET', computeType: 'formula', expression: 'GROSS + PF + PT' },
]

const fullMonth = { wage: 50000, workedDays: 22, totalWorkingDays: 22 }

test('a full month on the Regular Salary structure', () => {
  const { context, gross, deductions, net } = computePayslipLines(REGULAR, fullMonth)

  assert.equal(context.BASIC, 50000)
  assert.equal(context.HRA, 20000)
  assert.equal(context.DA, 5000)
  assert.equal(context.GROSS, 75000)
  assert.equal(context.PF, -6000)
  assert.equal(context.PT, -200)
  assert.equal(context.NET, 68800)

  assert.equal(gross, 75000)
  assert.equal(deductions, -6200)
  assert.equal(net, 68800)
})

test('lines come back in sequence order', () => {
  const { lines } = computePayslipLines(REGULAR, fullMonth)
  assert.deepEqual(
    lines.map((l) => l.code),
    ['BASIC', 'HRA', 'DA', 'GROSS', 'PF', 'PT', 'NET']
  )
})

test('a rule added at sequence 35 flows into GROSS without any code change', () => {
  const withBonus = [
    ...REGULAR.map((r) =>
      r.code === 'GROSS' ? { ...r, expression: 'BASIC + HRA + DA + BONUS' } : r
    ),
    { sequence: 35, code: 'BONUS', name: 'Performance Bonus', category: 'ALW', computeType: 'percent', baseCode: 'BASIC', amount: 5 },
  ]

  const { context } = computePayslipLines(withBonus, fullMonth)
  assert.equal(context.BONUS, 2500)
  assert.equal(context.GROSS, 77500)
  assert.equal(context.NET, 71300)
})

test('quantity multiplies the computed amount', () => {
  const rules = [
    { sequence: 10, code: 'MEAL', name: 'Meal Allowance', category: 'ALW', computeType: 'fixed', amount: 100, quantity: 22 },
  ]
  const { context } = computePayslipLines(rules, fullMonth)
  assert.equal(context.MEAL, 2200)
})

test('proration — half a month pays half the basic', () => {
  const { context } = computePayslipLines(REGULAR, {
    wage: 50000,
    workedDays: 11,
    totalWorkingDays: 22,
  })
  assert.equal(context.BASIC, 25000)
  assert.equal(context.NET, 34300)
})

test('a percentage of a code that runs later fails with a clear message', () => {
  const badOrder = [
    { sequence: 10, code: 'HRA', name: 'HRA', category: 'ALW', computeType: 'percent', baseCode: 'BASIC', amount: 40 },
    { sequence: 20, code: 'BASIC', name: 'Basic', category: 'BASIC', computeType: 'fixed', amount: 100 },
  ]
  assert.throws(() => computePayslipLines(badOrder, fullMonth), /sequence after BASIC/)
})

test('a formula referencing a code that runs later fails with a clear message', () => {
  const badOrder = [
    { sequence: 10, code: 'GROSS', name: 'Gross', category: 'GROSS', computeType: 'formula', expression: 'BASIC * 2' },
    { sequence: 20, code: 'BASIC', name: 'Basic', category: 'BASIC', computeType: 'fixed', amount: 100 },
  ]
  assert.throws(() => computePayslipLines(badOrder, fullMonth), /rule sequence/i)
})

test('formulas cannot reach outside arithmetic', () => {
  assert.throws(() => evaluateFormula('process.exit(1)', {}), /Unexpected|no value yet/i)
  assert.throws(() => evaluateFormula('BASIC; drop()', { BASIC: 1 }), /Unexpected character/)
  assert.equal(evaluateFormula('(A + B) * 2 - 10', { A: 10, B: 15 }), 40)
})
