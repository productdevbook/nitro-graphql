import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { useDatabase } from './useDb'

export const auth = betterAuth({
  database: drizzleAdapter(useDatabase(), {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    database: {
      // Because we are using UUIDs as primary keys, we disable ID generation
      generateId: false,
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || 'fallback-secret-for-development',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
})
