/**
 * GraphQL Yoga WebSocket handler for subscriptions
 * Uses graphql-ws library with crossws adapter for proper protocol handling
 *
 * @see https://github.com/enisdenjo/graphql-ws
 */

import type { Hooks } from 'crossws'
import type { GraphQLSchema } from 'graphql'
import { importedConfig } from '#nitro-graphql/graphql-config'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'
import { handleProtocols } from 'graphql-ws'
import { makeHooks } from 'graphql-ws/use/crossws'
import { defineWebSocketHandler } from 'nitro/h3'
import { createMergedSchema } from '../../core/schema'

let schema: GraphQLSchema | null = null

/**
 * Get or create the merged GraphQL schema
 */
async function getSchema(): Promise<GraphQLSchema> {
  if (!schema) {
    schema = await createMergedSchema({
      schemas,
      resolvers,
      directives,
      moduleConfig,
    })
  }
  return schema
}

// Create graphql-ws hooks for crossws
const gqlWsHooks = makeHooks({
  schema: () => getSchema(),
  context: async (ctx) => {
    // Include any context from importedConfig
    const configContext = typeof importedConfig.context === 'function'
      ? await (importedConfig.context as Function)({ connectionParams: ctx.connectionParams })
      : importedConfig.context || {}

    return {
      connectionParams: ctx.connectionParams,
      ...configContext,
    }
  },
})

// Wrap with upgrade hook for crossws 0.4+ protocol negotiation
const hooks: Partial<Hooks> = {
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

export default defineWebSocketHandler(hooks)
