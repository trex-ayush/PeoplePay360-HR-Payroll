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
  get: (id) => api.get(`/employees/${id}`),
  create: (body) => api.post('/employees', body),
  update: (id, body) => api.patch(`/employees/${id}`, body),
  archive: (id) => api.delete(`/employees/${id}`),
}

export const departmentsApi = {
  list: () => api.get('/departments'),
  create: (body) => api.post('/departments', body),
  update: (id, body) => api.patch(`/departments/${id}`, body),
}

export const schedulesApi = {
  list: (params) => api.get(`/working-schedules${query(params)}`),
  get: (id) => api.get(`/working-schedules/${id}`),
  create: (body) => api.post('/working-schedules', body),
  update: (id, body) => api.patch(`/working-schedules/${id}`, body),
}
