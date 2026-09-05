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

export const CONTRACT_STATES = ['draft', 'running', 'expired']

export const RULE_CATEGORIES = ['BASIC', 'ALW', 'GROSS', 'DED', 'NET']

export const COMPUTE_TYPES = ['fixed', 'percent', 'formula']

// Bases a percentage rule can be taken of: the contract wage, or any rule code
// computed earlier in the sequence.
export const PERCENT_BASES = ['WAGE', 'BASIC', 'GROSS']

export const PAYRUN_STATES = ['draft', 'computed', 'validated', 'paid']

// A payslip only exists once its payrun has been computed, so there is no draft.
export const PAYSLIP_STATES = ['done', 'paid']
