export function notFound(req, _res, next) {
  const err = new Error(`No route for ${req.method} ${req.originalUrl}`)
  err.status = 404
  next(err)
}

export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500
  let message = err.message || 'Something went wrong'
  let details = null

  if (err.name === 'ValidationError') {
    status = 400
    message = 'Some fields need attention'
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
  }

  if (err.name === 'CastError') {
    status = 400
    message = `"${err.value}" is not a valid ${err.path}`
  }

  if (err.code === 11000) {
    status = 409
    const field = Object.keys(err.keyPattern || {})[0] || 'value'
    message = `That ${field} is already in use`
  }

  if (status >= 500) console.error('[error]', err)

  res.status(status).json({ error: { message, details } })
}
