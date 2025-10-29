// Example context definition - please change it to your needs
// import type { Database } from '../utils/useDb'

declare module 'h3' {
  interface H3EventContext {
    // Add your custom context properties here
    // useDatabase: () => Database
    // tables: typeof import('../drizzle/schema')
    // auth?: {
    //   user?: {
    //     id: string
    //     role: 'admin' | 'user'
    //   }
    // }
  }
}