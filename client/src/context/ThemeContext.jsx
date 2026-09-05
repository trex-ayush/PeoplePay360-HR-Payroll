import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '@/config/constants'
import { storage } from '@/utils/storage'

const ThemeContext = createContext(null)

function readInitialTheme() {
  const saved = storage.getRaw(STORAGE_KEYS.theme)
  return saved === 'dark' || saved === 'light' ? saved : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    storage.setRaw(STORAGE_KEYS.theme, theme)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme: () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light')),
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
