import { z } from 'zod'

export const employeeSchema = z.object({
  code: z.string().min(1, 'Employee code is required'),
  name: z.string().min(1, 'Name is required'),
  workEmail: z.string().min(1, 'Work email is required').email('Enter a valid email'),
  phone: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  manager: z.string().optional(),
  schedule: z.string().min(1, 'Working schedule is required'),
  jobPosition: z.string().optional(),
  workLocation: z.string().optional(),
  employeeType: z.enum(['full_time', 'contract', 'intern']),
  bankAccount: z.string().optional(),
  active: z.coerce.boolean(),
})
