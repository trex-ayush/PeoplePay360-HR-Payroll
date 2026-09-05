export function notFound(req, _res, next) {
  const err = new Error(`No route for ${req.method} ${req.originalUrl}`)
  err.status = 404
  next(err)
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500
  if (status >= 500) console.error('[error]', err)

  res.status(status).json({ error: { message: err.message || 'Something went wrong' } })
}
