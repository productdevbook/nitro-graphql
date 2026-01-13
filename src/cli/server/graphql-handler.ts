/**
 * CLI GraphQL Handler
 *
 * Creates a GraphQL handler using the core server factory.
 * This is the CLI equivalent of src/nitro/routes/graphql-yoga.ts.
 */

import type { CoreServerInstance } from '../../core/server/types'
import type { CLIContext } from '../index'
import consola from 'consola'
import { BASE_SCHEMA, createYogaServer } from '../../core/server/yoga'
import { loadDirectiveDefinitions, loadResolverDefinitions, loadSchemaDefinitions } from './loader'

const logger = consola.withTag('nitro-graphql')

let serverInstance: CoreServerInstance | null = null

/**
 * Create the GraphQL request handler
 *
 * Uses the same createYogaServer() from core that Nitro uses,
 * ensuring 100% consistent behavior between CLI and Nitro module.
 */
export async function createGraphQLHandler(ctx: CLIContext): Promise<(request: Request) => Promise<Response>> {
  // Load from files (CLI-specific part)
  const loadedSchemas = await loadSchemaDefinitions(ctx)
  const resolvers = await loadResolverDefinitions(ctx)
  const directives = await loadDirectiveDefinitions(ctx)

  // Always add base schema first to support extend types
  const schemas = [BASE_SCHEMA, ...loadedSchemas]

  // Create server using CORE factory (SAME CODE AS NITRO!)
  serverInstance = await createYogaServer({
    schemas,
    resolvers,
    directives,
    moduleConfig: {
      federation: ctx.config.federation,
    },
    endpoint: ctx.config.endpoint?.graphql || '/graphql',
    security: ctx.config.security,
  })

  logger.success(`GraphQL server created with ${schemas.length} schema(s) and ${resolvers.length} resolver(s)`)

  // Return fetch handler (web standard API)
  return (request: Request) => serverInstance!.fetch(request)
}

/**
 * Reload the GraphQL handler (for hot reload)
 */
export async function reloadGraphQLHandler(ctx: CLIContext): Promise<(request: Request) => Promise<Response>> {
  serverInstance = null // Clear cache
  return createGraphQLHandler(ctx)
}

/**
 * Get the current server instance (for WebSocket setup, etc.)
 */
export function getServerInstance(): CoreServerInstance | null {
  return serverInstance
}
