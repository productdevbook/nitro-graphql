import type { tables } from '../drizzle'
// Example context definition - please change it to your needs
import type { Database } from '../utils/useDb'

declare module 'nitro/h3' {
  interface H3EventContext {
    // Add your custom context properties here
    database: Database
    tables: tables
    // auth?: {
    //   user?: {
    //     id: string
    //     role: 'admin' | 'user'
    //   }
    // }
  }
}

export {}
