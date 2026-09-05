import { z } from 'zod'

export const contractSchema = z
  .object({
    reference: z.string().min(1, 'Contract reference is required'),
    employee: z.string().min(1, 'Employee is required'),
    department: z.string().optional(),
    structure: z.string().min(1, 'Salary structure is required'),
    schedule: z.string().optional(),
    jobPosition: z.string().optional(),
    wage: z.coerce.number().min(0, 'Wage cannot be negative'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
    notes: z.string().optional(),
    state: z.enum(['draft', 'running', 'expired']),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: 'End date cannot be before the start date',
    path: ['endDate'],
  })
