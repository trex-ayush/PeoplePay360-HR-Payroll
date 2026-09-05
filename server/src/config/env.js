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
  inviteExpiresInDays: Number(process.env.INVITE_EXPIRES_IN_DAYS) || 7,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'PeoplePay360 <no-reply@peoplepay360.local>',
  },
}

export const mailEnabled = Boolean(env.smtp.host && env.smtp.user)

export const isProd = env.nodeEnv === 'production'
