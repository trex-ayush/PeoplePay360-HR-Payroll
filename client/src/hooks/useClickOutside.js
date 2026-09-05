import { useEffect } from 'react'

// Accepts one ref or several, so a trigger and its portalled menu can count as
// a single region.
export function useClickOutside(refs, handler) {
  useEffect(() => {
    const list = Array.isArray(refs) ? refs : [refs]
    const listener = (event) => {
      if (list.some((ref) => ref.current?.contains(event.target))) return
      handler(event)
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [refs, handler])
}
