import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Work email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
