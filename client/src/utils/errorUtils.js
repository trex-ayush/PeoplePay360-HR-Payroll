export function getErrorMessage(err) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string') return err
  return 'Something went wrong. Please try again.'
}
