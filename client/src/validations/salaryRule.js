import { z } from 'zod'

export const salaryRuleSchema = z
  .object({
    structure: z.string().min(1, 'Salary structure is required'),
    name: z.string().min(1, 'Rule name is required'),
    code: z
      .string()
      .min(1, 'Code is required')
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Use letters, digits and underscore, starting with a letter'),
    category: z.enum(['BASIC', 'ALW', 'GROSS', 'DED', 'NET']),
    sequence: z.coerce.number().min(0, 'Sequence cannot be negative'),
    computeType: z.enum(['fixed', 'percent', 'formula']),
    amount: z.coerce.number(),
    baseCode: z.string().optional(),
    expression: z.string().optional(),
    quantity: z.coerce.number().min(0, 'Quantity cannot be negative'),
  })
  .refine((data) => data.computeType !== 'percent' || Boolean(data.baseCode?.trim()), {
    message: 'Pick the code this percentage is taken of',
    path: ['baseCode'],
  })
  .refine((data) => data.computeType !== 'formula' || Boolean(data.expression?.trim()), {
    message: 'Enter the formula',
    path: ['expression'],
  })

export const salaryStructureSchema = z.object({
  name: z.string().min(1, 'Structure name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  active: z.coerce.boolean(),
})
