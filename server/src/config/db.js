import mongoose from 'mongoose'
import { env } from './env.js'

export async function connectDB(options = {}) {
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not set. Add it to server/.env')
  }

  await mongoose.connect(env.mongoUri, options)
  console.log(`[db] connected → ${mongoose.connection.name}`)
}
