import type { Session, User } from 'better-auth'
import type { tables } from '../drizzle'
import type { Database } from '../utils/useDb'

declare module 'nitro/h3' {
  interface H3EventContext {
    // Database access
    database: Database
    tables: typeof tables
    // Better Auth session and user
    session: Session | null
    user: User
  }
}

export {}
