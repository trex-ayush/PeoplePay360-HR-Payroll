import { createApp } from './app.js'
import { connectDB } from './config/db.js'
import { env } from './config/env.js'

try {
  await connectDB()
  createApp().listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`)
  })
} catch (err) {
  console.error(`[api] failed to start: ${err.message}`)
  process.exit(1)
}
