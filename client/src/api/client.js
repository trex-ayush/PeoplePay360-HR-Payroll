import { STORAGE_KEYS } from '@/config/constants'
import { storage } from '@/utils/storage'

export const tokenStore = {
  get: () => storage.getRaw(STORAGE_KEYS.authToken),
  set: (token) => storage.setRaw(STORAGE_KEYS.authToken, token),
  clear: () => storage.remove(STORAGE_KEYS.authToken),
}

async function request(path, { method = 'GET', body } = {}) {
  const token = tokenStore.get()

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new Error('Cannot reach the server. Is the API running on port 4000?')
  }

  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    const error = new Error(payload.error?.message || 'Request failed')
    error.status = res.status
    throw error
  }

  return payload
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
