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
