import dotenv from 'dotenv'

dotenv.config()

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminSecret: process.env.ADMIN_SECRET || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
}

export const isProd = env.nodeEnv === 'production'
