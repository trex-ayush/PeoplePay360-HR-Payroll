import { createContext, useContext, useMemo } from 'react'
import toast, { Toaster } from 'react-hot-toast'

const NotificationContext = createContext(null)

const toastStyle = {
  borderRadius: '12px',
  background: 'var(--color-bg-primary)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-dropdown)',
}

export function NotificationProvider({ children }) {
  const value = useMemo(
    () => ({
      success: (msg) => toast.success(msg),
      error: (msg) => toast.error(msg),
      info: (msg) => toast(msg, { icon: 'ℹ️' }),
      warning: (msg) => toast(msg, { icon: '⚠️' }),
      dismiss: (id) => toast.dismiss(id),
    }),
    []
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: toastStyle,
          success: { iconTheme: { primary: 'var(--color-success)', secondary: '#fff' } },
          error: { iconTheme: { primary: 'var(--color-danger)', secondary: '#fff' } },
        }}
      />
    </NotificationContext.Provider>
  )
}

export function useNotify() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotify must be used within a NotificationProvider')
  return ctx
}
