import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// A drawer is part of where you are, not local state: giving it its own path means
// a refresh, the back button and a pasted link all reopen the same record. Whatever
// segment follows the page's own path is the record the drawer is showing.
export function useDrawerRoute(basePath) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const rest = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : ''
  const openId = rest.replace(/^\//, '').split('/')[0] || null

  const setOpenId = useCallback(
    (id) => {
      // Closing replaces, so Back does not walk straight back into the drawer.
      navigate(id ? `${basePath}/${id}` : basePath, { replace: !id })
    },
    [basePath, navigate]
  )

  return [openId, setOpenId]
}
