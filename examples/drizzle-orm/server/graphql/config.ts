import { defineGraphQLConfig } from 'nitro-graphql/define'
import { createDefaultMaskError } from 'nitro-graphql/utils'

// Custom GraphQL Yoga configuration
export default defineGraphQLConfig({
  maskedErrors: {
    // Use the default error handler that supports ZodError, HTTPError, and more
    maskError: createDefaultMaskError(),
  },
  // Additional yoga options can be added here
  // See: https://the-guild.dev/graphql/yoga-server/docs
})
