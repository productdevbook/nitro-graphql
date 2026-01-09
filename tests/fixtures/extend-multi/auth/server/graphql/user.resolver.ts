import { defineQuery } from 'nitro-graphql/define'

export const authQueries = defineQuery({
  currentUser: () => ({ id: 'user-1', email: 'test@example.com' }),
})
