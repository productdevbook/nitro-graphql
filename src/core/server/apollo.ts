/**
 * Core Apollo Server Factory
 *
 * Creates an Apollo Server instance with security defaults.
 * Used by Nitro routes — mirrors the pattern from yoga.ts.
 */

import type { BaseContext } from '@apollo/server'
import type { GraphQLFormattedError } from 'graphql'
import type { CoreServerOptions } from './types'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import defu from 'defu'
import { createMergedSchema } from '../schema/builder'

/**
 * Error codes that represent user-facing errors and should not be masked
 * in production. All other error codes are treated as internal and masked.
 */
export const APOLLO_USER_FACING_ERROR_CODES = [
  'BAD_USER_INPUT',
  'GRAPHQL_VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'BAD_REQUEST',
] as const

/**
 * Create an Apollo Server instance
 *
 * Follows the same factory pattern as createYogaServer:
 * - Takes CoreServerOptions
 * - Applies security defaults
 * - Merges user config via defu
 */
export async function createApolloServerInstance(
  options: CoreServerOptions,
): Promise<ApolloServer<BaseContext>> {
  const {
    schemas,
    resolvers,
    directives,
    moduleConfig,
    security,
    importedConfig,
  } = options

  const schema = await createMergedSchema({
    schemas,
    resolvers,
    directives: directives || [],
    moduleConfig,
  })

  const securityConfig = security || {
    introspection: true,
    playground: true,
    maskErrors: false,
    disableSuggestions: false,
  }

  // Build plugins based on security config
  const plugins = securityConfig.playground
    ? [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
    : [ApolloServerPluginLandingPageDisabled()]

  const server = new ApolloServer<BaseContext>(defu({
    schema,
    introspection: securityConfig.introspection,
    plugins,
    formatError: securityConfig.maskErrors
      ? (formattedError: GraphQLFormattedError) => {
          const code = formattedError?.extensions?.code as string | undefined
          if (code && (APOLLO_USER_FACING_ERROR_CODES as readonly string[]).includes(code)) {
            return formattedError
          }
          return {
            message: 'Internal server error',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          }
        }
      : undefined,
  }, importedConfig))

  await server.start()
  return server
}
