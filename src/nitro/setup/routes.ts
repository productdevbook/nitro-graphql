/**
 * Route handler registration for GraphQL endpoints
 */

import type { Nitro } from 'nitro/types'
import { fileURLToPath } from 'node:url'
import { join } from 'pathe'
import { ENDPOINT_DEBUG, GRAPHQL_HTTP_METHODS } from '../../core/constants'

/**
 * Register GraphQL route handlers
 */
export function registerRouteHandlers(nitro: Nitro): void {
  const runtime = fileURLToPath(new URL('../routes', import.meta.url))
  const framework = nitro.options.graphql?.framework

  // Main GraphQL endpoint
  if (framework === 'graphql-yoga') {
    for (const method of GRAPHQL_HTTP_METHODS) {
      nitro.options.handlers.push({
        route: nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql',
        handler: join(runtime, 'graphql-yoga'),
        method,
      })
    }
  }

  if (framework === 'apollo-server') {
    for (const method of GRAPHQL_HTTP_METHODS) {
      nitro.options.handlers.push({
        route: nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql',
        handler: join(runtime, 'apollo-server'),
        method,
      })
    }
  }

  // Health check endpoint
  nitro.options.handlers.push({
    route: nitro.options.runtimeConfig.graphql?.endpoint?.healthCheck || '/api/graphql/health',
    handler: join(runtime, 'health'),
    method: 'GET',
  })

  // Debug endpoint (development only)
  if (nitro.options.dev) {
    nitro.options.handlers.push({
      route: ENDPOINT_DEBUG,
      handler: join(runtime, 'debug'),
      method: 'GET',
    })
  }
}
