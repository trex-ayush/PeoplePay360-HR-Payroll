import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '@/config/constants'
import { storage } from '@/utils/storage'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => storage.getRaw(STORAGE_KEYS.sidebarCollapsed) === 'true'
  )

  useEffect(() => {
    storage.setRaw(STORAGE_KEYS.sidebarCollapsed, sidebarCollapsed ? 'true' : 'false')
  }, [sidebarCollapsed])

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed((v) => !v),
      setSidebarCollapsed,
    }),
    [sidebarCollapsed]
  )

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within a UIProvider')
  return ctx
}
