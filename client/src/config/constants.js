export const STORAGE_KEYS = {
  authToken: 'peoplepay360.token',
  theme: 'app-theme',
  sidebarCollapsed: 'sidebar-collapsed',
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
