import { SalaryRule } from '../models/SalaryRule.js'
import { computePayslipLines } from '../services/payroll.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

const POPULATE = { path: 'structure', select: 'name code' }

export const list = asyncHandler(async (req, res) => {
  const { structure, search, category } = req.query

  const filter = {}
  if (structure) filter.structure = structure
  if (category) filter.category = category
  if (search) {
    filter.$or = [{ name: new RegExp(search, 'i') }, { code: new RegExp(search, 'i') }]
  }

  const rules = await SalaryRule.find(filter).populate(POPULATE).sort({ sequence: 1 })
  res.json({ rules })
})

export const getOne = asyncHandler(async (req, res) => {
  const rule = await SalaryRule.findById(req.params.id).populate(POPULATE)
  if (!rule) throw httpError(404, 'Salary rule not found')
  res.json({ rule })
})

export const create = asyncHandler(async (req, res) => {
  const rule = await SalaryRule.create(req.body)
  res.status(201).json({ rule: await rule.populate(POPULATE) })
})

export const update = asyncHandler(async (req, res) => {
  const rule = await SalaryRule.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate(POPULATE)
  if (!rule) throw httpError(404, 'Salary rule not found')
  res.json({ rule })
})

export const remove = asyncHandler(async (req, res) => {
  const rule = await SalaryRule.findByIdAndDelete(req.params.id)
  if (!rule) throw httpError(404, 'Salary rule not found')
  res.json({ deleted: rule.code })
})

/**
 * Runs a structure's rules against a sample wage so the configuration screen
 * can show what a payslip would look like before any payrun exists.
 */
export const preview = asyncHandler(async (req, res) => {
  const wage = Number(req.query.wage) || 50000
  const rules = await SalaryRule.find({ structure: req.params.structureId }).lean()

  if (!rules.length) throw httpError(400, 'This structure has no rules yet')

  try {
    const result = computePayslipLines(rules, {
      wage,
      workedDays: 22,
      totalWorkingDays: 22,
    })
    res.json({ wage, ...result })
  } catch (err) {
    throw httpError(400, err.message)
  }
})
