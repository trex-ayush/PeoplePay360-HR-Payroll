import { useEffect } from 'react'
import { env } from '@/config/env'

export function usePageTitle(title) {
  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = `${title} • ${env.appName}`
    return () => {
      document.title = previous
    }
  }, [title])
}
