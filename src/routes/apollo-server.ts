import type { BaseContext } from '@apollo/server'
import { importedConfig } from '#nitro-graphql/graphql-config'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import defu from 'defu'
import { startServerAndCreateH3Handler } from 'nitro-graphql/utils/apollo'
import { defineEventHandler } from 'nitro/h3'
import { createMergedSchema } from '../utils/schema-builder'

let apolloServer: ApolloServer<BaseContext> | null = null
let serverStarted = false

async function createApolloServer() {
  if (!apolloServer) {
    const schema = await createMergedSchema({
      schemas,
      resolvers,
      directives,
      moduleConfig,
    })

    // Get security config from module config (resolved with environment defaults)
    const securityConfig = moduleConfig.security || {
      introspection: true,
      playground: true,
      maskErrors: false,
      disableSuggestions: false,
    }

    // Build plugins based on security config
    const plugins: any[] = []
    if (securityConfig.playground) {
      plugins.push(ApolloServerPluginLandingPageLocalDefault({ embed: true }))
    }
    else {
      plugins.push(ApolloServerPluginLandingPageDisabled())
    }

    // User-facing error codes that should not be masked
    const userFacingCodes = [
      'BAD_USER_INPUT',
      'GRAPHQL_VALIDATION_FAILED',
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'BAD_REQUEST',
    ]

    apolloServer = new ApolloServer<BaseContext>(defu({
      schema,
      introspection: securityConfig.introspection,
      plugins,
      // Error masking for production
      formatError: securityConfig.maskErrors
        ? (formattedError: any, _error: any) => {
            const code = formattedError?.extensions?.code
            // Allow user-facing errors to pass through
            if (code && userFacingCodes.includes(code)) {
              return formattedError
            }
            // Mask internal server errors
            return {
              message: 'Internal server error',
              extensions: { code: 'INTERNAL_SERVER_ERROR' },
            }
          }
        : undefined,
    }, importedConfig))

    // Start the server only once after creation
    if (!serverStarted) {
      await apolloServer.start()
      serverStarted = true
    }
  }
  return apolloServer
}

// Create a wrapper that handles async Apollo Server creation
let serverPromise: Promise<ApolloServer<BaseContext>> | null = null

export default defineEventHandler(async (event) => {
  if (!serverPromise) {
    serverPromise = createApolloServer()
  }

  const server = await serverPromise
  const h3Handler = startServerAndCreateH3Handler(server, {
    context: async () => ({ event }),
    serverAlreadyStarted: true,
  })

  return h3Handler(event)
})
