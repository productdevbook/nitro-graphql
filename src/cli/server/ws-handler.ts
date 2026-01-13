/**
 * CLI WebSocket Handler
 *
 * GraphQL subscriptions support for CLI dev server.
 * Uses graphql-ws with crossws adapter.
 */

import type { Hooks } from 'crossws'
import type { GraphQLSchema } from 'graphql'
import { handleProtocols } from 'graphql-ws'
import { makeHooks } from 'graphql-ws/use/crossws'

/**
 * Create WebSocket hooks for GraphQL subscriptions
 *
 * @param getSchema - Function to get the GraphQL schema
 * @param context - Optional context to pass to resolvers
 */
export function createGraphQLWebSocketHooks(
  getSchema: () => Promise<GraphQLSchema> | GraphQLSchema,
  context?: Record<string, unknown>,
): Partial<Hooks> {
  // Create graphql-ws hooks for crossws
  const gqlWsHooks = makeHooks({
    schema: getSchema,
    context: async (ctx) => {
      // Build context from connectionParams
      const baseContext = { connectionParams: ctx.connectionParams }

      // Merge with provided context
      if (context) {
        return { ...baseContext, ...context }
      }

      return baseContext
    },
  })

  // Wrap with upgrade hook for protocol negotiation
  return {
    upgrade(request) {
      const protocol = request.headers.get('sec-websocket-protocol')
      const selected = handleProtocols(protocol || '')

      if (selected) {
        return {
          headers: { 'Sec-WebSocket-Protocol': selected },
        }
      }
      return {}
    },
    ...gqlWsHooks,
  }
}

/**
 * Create crossws plugin configuration for srvx
 *
 * @example
 * ```typescript
 * import { plugin as ws } from 'crossws/server'
 * import { createWebSocketPlugin } from './ws-handler'
 *
 * const server = serve({
 *   plugins: [ws(createWebSocketPlugin(getSchema))],
 *   fetch(req) { ... }
 * })
 * ```
 */
export function createWebSocketPlugin(
  getSchema: () => Promise<GraphQLSchema> | GraphQLSchema,
  context?: Record<string, unknown>,
) {
  return createGraphQLWebSocketHooks(getSchema, context)
}
