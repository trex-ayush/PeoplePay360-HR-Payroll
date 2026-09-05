export const ROLES = [
  'employee',
  'hr_manager',
  'hr_payroll_user',
  'hr_payroll_manager',
  'admin',
]

// Each tier includes everything below it, as the spec describes them
// ("All HR Manager permissions plus...", "All HR Payroll User permissions with...").
export const HR_ROLES = ['hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']
export const PAYROLL_ROLES = ['hr_payroll_user', 'hr_payroll_manager', 'admin']
export const PAYROLL_CONFIG_ROLES = ['hr_payroll_manager', 'admin']

export const EMPLOYEE_TYPES = ['full_time', 'contract', 'intern']

export const SCHEDULE_TYPES = ['full_time', 'part_time', 'shift', 'flexible']

export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]
