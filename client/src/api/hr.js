import { api } from './client'

const query = (params) => {
  const search = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const employeesApi = {
  list: (params) => api.get(`/employees${query(params)}`),
  nextCode: () => api.get('/employees/next-code'),
  get: (id) => api.get(`/employees/${id}`),
  create: (body) => api.post('/employees', body),
  update: (id, body) => api.patch(`/employees/${id}`, body),
  remove: (id) => api.delete(`/employees/${id}`),
  related: (id) => api.get(`/employees/${id}/related`),
}

export const departmentsApi = {
  list: (params) => api.get(`/departments${query(params)}`),
  create: (body) => api.post('/departments', body),
  update: (id, body) => api.patch(`/departments/${id}`, body),
  remove: (id) => api.delete(`/departments/${id}`),
  related: (id) => api.get(`/departments/${id}/related`),
}

export const schedulesApi = {
  list: (params) => api.get(`/working-schedules${query(params)}`),
  get: (id) => api.get(`/working-schedules/${id}`),
  create: (body) => api.post('/working-schedules', body),
  update: (id, body) => api.patch(`/working-schedules/${id}`, body),
}

export const contractsApi = {
  list: (params) => api.get(`/contracts${query(params)}`),
  nextReference: (year) => api.get(`/contracts/next-reference${query({ year })}`),
  get: (id) => api.get(`/contracts/${id}`),
  create: (body) => api.post('/contracts', body),
  update: (id, body) => api.patch(`/contracts/${id}`, body),
  remove: (id) => api.delete(`/contracts/${id}`),
}

export const salaryStructuresApi = {
  list: (params) => api.get(`/salary-structures${query(params)}`),
  get: (id) => api.get(`/salary-structures/${id}`),
  create: (body) => api.post('/salary-structures', body),
  update: (id, body) => api.patch(`/salary-structures/${id}`, body),
  remove: (id) => api.delete(`/salary-structures/${id}`),
  preview: (id, wage) => api.get(`/salary-rules/preview/${id}${query({ wage })}`),
}

export const salaryRulesApi = {
  list: (params) => api.get(`/salary-rules${query(params)}`),
  get: (id) => api.get(`/salary-rules/${id}`),
  create: (body) => api.post('/salary-rules', body),
  update: (id, body) => api.patch(`/salary-rules/${id}`, body),
  remove: (id) => api.delete(`/salary-rules/${id}`),
}

export const payrunsApi = {
  list: (params) => api.get(`/payruns${query(params)}`),
  eligibleEmployees: (params) => api.get(`/payruns/eligible-employees${query(params)}`),
  get: (id) => api.get(`/payruns/${id}`),
  create: (body) => api.post('/payruns', body),
  compute: (id) => api.post(`/payruns/${id}/compute`),
  validate: (id) => api.post(`/payruns/${id}/validate`),
  markPaid: (id) => api.post(`/payruns/${id}/mark-paid`),
  remove: (id) => api.delete(`/payruns/${id}`),
}

export const payslipsApi = {
  list: (params) => api.get(`/payslips${query(params)}`),
  get: (id) => api.get(`/payslips/${id}`),
}

export const timeOffTypesApi = {
  list: (params) => api.get(`/timeoff/types${query(params)}`),
  get: (id) => api.get(`/timeoff/types/${id}`),
  create: (body) => api.post('/timeoff/types', body),
  update: (id, body) => api.patch(`/timeoff/types/${id}`, body),
  remove: (id) => api.delete(`/timeoff/types/${id}`),
}

export const allocationsApi = {
  list: (params) => api.get(`/timeoff/allocations${query(params)}`),
  get: (id) => api.get(`/timeoff/allocations/${id}`),
  create: (body) => api.post('/timeoff/allocations', body),
  update: (id, body) => api.patch(`/timeoff/allocations/${id}`, body),
  approve: (id) => api.post(`/timeoff/allocations/${id}/approve`),
  refuse: (id) => api.post(`/timeoff/allocations/${id}/refuse`),
  remove: (id) => api.delete(`/timeoff/allocations/${id}`),
}

export const timeOffRequestsApi = {
  list: (params) => api.get(`/timeoff/requests${query(params)}`),
  get: (id) => api.get(`/timeoff/requests/${id}`),
  create: (body) => api.post('/timeoff/requests', body),
  update: (id, body) => api.patch(`/timeoff/requests/${id}`, body),
  approve: (id, body) => api.post(`/timeoff/requests/${id}/approve`, body),
  refuse: (id) => api.post(`/timeoff/requests/${id}/refuse`),
  remove: (id) => api.delete(`/timeoff/requests/${id}`),
}
