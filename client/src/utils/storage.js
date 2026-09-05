export const storage = {
  getRaw(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setRaw(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      // private mode — value just won't survive a reload
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      // nothing to clear
    }
  },
}
