import { SalaryStructure } from '../models/SalaryStructure.js'
import { SalaryRule } from '../models/SalaryRule.js'
import { Contract } from '../models/Contract.js'
import { asyncHandler, httpError } from '../utils/asyncHandler.js'

// A5 asks the list to show rule and employee counts alongside each structure.
async function withCounts(structure) {
  const [rules, employees] = await Promise.all([
    SalaryRule.countDocuments({ structure: structure._id }),
    Contract.distinct('employee', { structure: structure._id }),
  ])
  return { ...structure, rules, employees: employees.length }
}

export const list = asyncHandler(async (req, res) => {
  const filter = req.query.active === 'all' ? {} : { active: true }
  if (req.query.search) filter.name = new RegExp(req.query.search, 'i')

  const structures = await SalaryStructure.find(filter).sort({ name: 1 }).lean()
  res.json({ structures: await Promise.all(structures.map(withCounts)) })
})

export const getOne = asyncHandler(async (req, res) => {
  const structure = await SalaryStructure.findById(req.params.id).lean()
  if (!structure) throw httpError(404, 'Salary structure not found')

  const rules = await SalaryRule.find({ structure: structure._id }).sort({ sequence: 1 }).lean()
  res.json({ structure: { ...(await withCounts(structure)), ruleList: rules } })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ structure: await SalaryStructure.create(req.body) })
})

export const update = asyncHandler(async (req, res) => {
  const structure = await SalaryStructure.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
  if (!structure) throw httpError(404, 'Salary structure not found')
  res.json({ structure })
})

export const remove = asyncHandler(async (req, res) => {
  const structure = await SalaryStructure.findById(req.params.id)
  if (!structure) throw httpError(404, 'Salary structure not found')

  const contracts = await Contract.countDocuments({ structure: structure._id })
  if (contracts) {
    throw httpError(
      409,
      `${contracts} contract${contracts > 1 ? 's use' : ' uses'} ${structure.name}. ` +
        `Payslips are calculated from it, so move those contracts to another structure first.`
    )
  }

  const { deletedCount } = await SalaryRule.deleteMany({ structure: structure._id })
  await structure.deleteOne()

  res.json({ deleted: structure.name, rulesDeleted: deletedCount })
})
