import { defineGraphQLConfig } from 'nitro-graphql/define'
import { createDefaultMaskError } from 'nitro-graphql/utils'
import { tables } from '../drizzle'
import { auth } from '../utils/auth'
import { useDatabase } from '../utils/useDb'

// Custom GraphQL Yoga configuration with Better Auth integration
export default defineGraphQLConfig({
  maskedErrors: {
    // Use the default error handler that supports ZodError, HTTPError, and more
    maskError: createDefaultMaskError(),
  },
  context: async (event) => {
    const db = useDatabase()

    // Retrieve session from Better Auth
    const session = await auth.api.getSession({
      headers: event.headers,
    })

    return {
      context: {
        tables,
        database: db,
        // Better Auth session and user
        session: session?.session ?? null,
        user: session?.user ?? null,
      },
    }
  },
  // Additional yoga options can be added here
  // See: https://the-guild.dev/graphql/yoga-server/docs
})
