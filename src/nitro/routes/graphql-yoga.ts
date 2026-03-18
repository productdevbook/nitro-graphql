/**
 * GraphQL Yoga Route Handler
 *
 * Nitro/H3 wrapper around the core GraphQL Yoga server.
 * Uses virtual modules to load schemas, resolvers, and directives.
 */

import type { CoreServerInstance } from '../../core/server/types'
import { importedConfig } from '#nitro-graphql/graphql-config'
import { moduleConfig } from '#nitro-graphql/module-config'
import { directives } from '#nitro-graphql/server-directives'
import { resolvers } from '#nitro-graphql/server-resolvers'
import { schemas } from '#nitro-graphql/server-schemas'
import { defineEventHandler, getQuery } from 'nitro/h3'
import { BASE_SCHEMA_DEF } from '../../core/schema/builder'
import { createYogaServer } from '../../core/server/yoga'

// Cache control header for playground HTML (1 month)
const PLAYGROUND_CACHE_HEADER = 'public, max-age=2592000, stale-while-revalidate=86400'

let server: CoreServerInstance | null = null

export default defineEventHandler(async (event) => {
  if (!server) {
    // BASE_SCHEMA_DEF provides empty Query/Mutation types required for
    // `extend type Query { ... }` syntax to work in user schemas
    server = await createYogaServer({
      schemas: [BASE_SCHEMA_DEF, ...schemas],
      resolvers,
      directives,
      moduleConfig,
      endpoint: moduleConfig.endpoint?.graphql || '/api/graphql',
      security: moduleConfig.security,
      importedConfig,
    })
  }

  // Handle request using web standard fetch API
  const response = await server.fetch(event.req, event as unknown as Record<string, unknown>)

  // Check if this is a playground request (GET without query param)
  const isPlaygroundRequest = event.req.method === 'GET' && !getQuery(event).query

  // If resolver set a custom status code via event.res.status, use it
  if (event.res.status && event.res.status !== 200) {
    return new Response(response.body, {
      status: event.res.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  }

  // Add cache headers for playground HTML responses
  if (isPlaygroundRequest && response.headers.get('content-type')?.includes('text/html')) {
    const headers = new Headers(response.headers)
    headers.set('cache-control', PLAYGROUND_CACHE_HEADER)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  return new Response(response.body, response)
})
