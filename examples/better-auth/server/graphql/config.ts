import { createDefaultMaskError } from 'nitro-graphql/core'
import { defineGraphQLConfig } from 'nitro-graphql/define'
import { tables } from '../drizzle'
import { useDatabase } from '../utils/useDb'

// Custom GraphQL Yoga configuration with Better Auth integration
export default defineGraphQLConfig({
  maskedErrors: {
    // Use the default error handler that supports ZodError, HTTPError, and more
    maskError: createDefaultMaskError(),
  },
  context: async (event) => {
    const db = useDatabase()

    return {
      context: {
        ...event.context,
        tables,
        database: db,
      },
    }
  },
  // Additional yoga options can be added here
  // See: https://the-guild.dev/graphql/yoga-server/docs
})
