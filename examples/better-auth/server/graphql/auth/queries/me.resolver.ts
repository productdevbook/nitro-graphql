import type { User } from '../../../drizzle'
import { defineQuery } from 'nitro-graphql/define'

export const meQuery = defineQuery({
  me: async (_, args, { context }) => {
    // Return the authenticated user from context (@auth directive ensures user is not null)
    return context.user as unknown as User
  },
})
