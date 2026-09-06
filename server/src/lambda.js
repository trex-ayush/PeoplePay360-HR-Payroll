import serverless from 'serverless-http'
import { createApp } from './app.js'
import { connectDB } from './config/db.js'

const app = serverless(createApp())

// Held outside the handler so a warm container reuses one connection instead of
// opening a new one per request, which would exhaust the Atlas pool.
let connection

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  connection ??= connectDB({ maxPoolSize: 5, bufferCommands: false })
  await connection

  return app(event, context)
}
