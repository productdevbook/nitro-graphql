import { defineGraphQLConfig } from 'nitro-graphql/define'
import { createDefaultMaskError } from 'nitro-graphql/utils'
import { tables } from '../drizzle'
import { useDatabase } from '../utils/useDb'

// Custom GraphQL Yoga configuration
export default defineGraphQLConfig({
  maskedErrors: {
    // Use the default error handler that supports ZodError, HTTPError, and more
    maskError: createDefaultMaskError(),
  },
  context: async (event) => {
    // You can add custom context properties here if needed
    const db = useDatabase()
    return {
      context: {
        tables,
        database: db,
      },
      // Example: user authentication info, loaders, etc.
    }
  },
  // Additional yoga options can be added here
  // See: https://the-guild.dev/graphql/yoga-server/docs
})
