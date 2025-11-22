// Example GraphQL config file please change it to your needs
// import * as tables from '../drizzle/schema/index'
// import { useDatabase } from '../utils/useDb'

import { GraphQLError } from 'graphql'
import { defineGraphQLConfig } from 'nitro-graphql/define'
import { HTTPError } from 'nitro/h3'

export default defineGraphQLConfig({
  // graphql-yoga example config
  // context: () => {
  //   return {
  //     context: {
  //       useDatabase,
  //       tables,
  //     },
  //   }
  // },

  // Handle HTTPError and transform to GraphQL errors
  maskedErrors: {
    maskError: (error: unknown): Error => {
      // Type guard to check if error has originalError property
      if (error && typeof error === 'object' && 'originalError' in error) {
        const graphqlError = error as { originalError: unknown }

        // Check if the original error is an HTTPError from H3
        if (graphqlError.originalError instanceof HTTPError) {
          const httpError = graphqlError.originalError
          const statusCode = httpError.statusCode ?? 500

          // Create a proper GraphQLError with the HTTP status and message
          return new GraphQLError(httpError.message || 'Internal Server Error', {
            extensions: {
              code: statusCode,
              http: {
                status: statusCode,
              },
            },
          })
        }
      }

      // Fall back to default masking for other errors
      return error instanceof Error ? error : new Error(String(error))
    },
  },
})
