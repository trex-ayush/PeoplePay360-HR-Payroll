import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, tokenStore } from '@/api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // A stored token is only trusted once /auth/me confirms it.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false)
      return
    }

    let cancelled = false

    api
      .get('/auth/me')
      .then(({ user }) => !cancelled && setUser(user))
      .catch(() => {
        tokenStore.clear()
        if (!cancelled) setUser(null)
      })
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const { token, user } = await api.post('/auth/login', credentials)
    tokenStore.set(token)
    setUser(user)
    return user
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
