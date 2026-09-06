export const STORAGE_KEYS = {
  sidebarCollapsed: 'sidebar-collapsed',
  authToken: 'peoplepay360.token',
  theme: 'app-theme',
  employeesView: 'employees-view',
}

export const ROUTES = {
  login: '/login',
  dashboard: '/',
}

export const EMPLOYEE_TYPES = [
  { value: 'full_time', label: 'Full time' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
]

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const SCHEDULE_TYPES = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'shift', label: 'Shift' },
  { value: 'flexible', label: 'Flexible' },
]

export const CONTRACT_STATES = [
  { value: 'draft', label: 'Draft', tone: 'neutral' },
  { value: 'running', label: 'Running', tone: 'success' },
  { value: 'expired', label: 'Expired', tone: 'warning' },
]

export const ROLE_LABELS = {
  employee: 'Employee',
  hr_manager: 'HR Manager',
  hr_payroll_user: 'HR Payroll User',
  hr_payroll_manager: 'HR Payroll Manager',
  admin: 'Admin',
}

export const RULE_CATEGORIES = [
  { value: 'BASIC', label: 'Basic', tone: 'info' },
  { value: 'ALW', label: 'Allowance', tone: 'success' },
  { value: 'GROSS', label: 'Gross', tone: 'primary' },
  { value: 'DED', label: 'Deduction', tone: 'warning' },
  { value: 'NET', label: 'Net', tone: 'purple' },
]

export const COMPUTE_TYPES = [
  { value: 'fixed', label: 'Fixed Amount' },
  { value: 'percent', label: 'Percentage' },
  { value: 'formula', label: 'Formula' },
]

export const PAYRUN_STATES = [
  { value: 'draft', label: 'Draft', tone: 'neutral' },
  { value: 'computed', label: 'Computed', tone: 'info' },
  { value: 'validated', label: 'Validated', tone: 'success' },
  { value: 'paid', label: 'Paid', tone: 'purple' },
]

export const PAYSLIP_STATES = [
  { value: 'done', label: 'Done', tone: 'info' },
  { value: 'paid', label: 'Paid', tone: 'success' },
]

export const TIMEOFF_UNITS = [
  { value: 'days', label: 'Days' },
  { value: 'hours', label: 'Hours' },
]

export const TIMEOFF_COLORS = [
  { value: 'blue', label: 'Blue', swatch: 'bg-blue-500' },
  { value: 'green', label: 'Green', swatch: 'bg-emerald-500' },
  { value: 'amber', label: 'Amber', swatch: 'bg-amber-500' },
  { value: 'red', label: 'Red', swatch: 'bg-red-500' },
  { value: 'violet', label: 'Violet', swatch: 'bg-violet-500' },
]

// One company for now, but the schedule list shows it the way the mockup does.
export const COMPANY_NAME = 'OXP Pvt Ltd'

export const APPROVAL_BY = [
  { value: 'hr', label: 'HR Officer' },
  { value: 'manager', label: 'Manager' },
]

export const ALLOCATION_STATES = [
  { value: 'draft', label: 'To Approve', tone: 'warning' },
  { value: 'approved', label: 'Approved', tone: 'success' },
  { value: 'refused', label: 'Refused', tone: 'danger' },
]

export const REQUEST_STATES = [
  { value: 'draft', label: 'To Approve', tone: 'warning' },
  { value: 'approved', label: 'Approved', tone: 'success' },
  { value: 'refused', label: 'Refused', tone: 'danger' },
]

export const ALLOCATION_MODES = [
  { value: 'fixed', label: 'Fixed grant' },
  { value: 'accrual', label: 'Accrual' },
]

export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present', tone: 'success' },
  { value: 'late', label: 'Late', tone: 'warning' },
  { value: 'overtime', label: 'Overtime', tone: 'info' },
  { value: 'absent', label: 'Absent', tone: 'danger' },
]

// Drawers show a whole set at once — an employee picker, a record's history —
// with no pager of their own, so they ask for the largest page the API serves.
export const MAX_PAGE_SIZE = 200
