/**
 * Route handler registration for GraphQL endpoints
 */

import type { Nitro } from 'nitro/types'
import { ENDPOINT_DEBUG, GRAPHQL_HTTP_METHODS } from '../../core/constants'

/**
 * Register GraphQL route handlers
 *
 * Uses module specifiers instead of filesystem paths for route handlers.
 * This ensures handlers are resolved correctly both in local development
 * (monorepo symlink) and in CI/production (installed from npm).
 */
export function registerRouteHandlers(nitro: Nitro): void {
  const framework = nitro.options.graphql?.framework
  const subscriptions = nitro.options.graphql?.subscriptions
  const endpoint = nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql'

  // Main GraphQL endpoint (HTTP)
  if (framework === 'graphql-yoga') {
    for (const method of GRAPHQL_HTTP_METHODS) {
      nitro.options.handlers.push({
        route: endpoint,
        handler: 'nitro-graphql/nitro/routes/graphql-yoga',
        method,
      })
    }

    // Apollo Sandbox script proxy (cacheable)
    nitro.options.handlers.push({
      route: `${endpoint}/sandbox.js`,
      handler: 'nitro-graphql/nitro/routes/apollo-sandbox-script',
      method: 'GET',
    })

    // WebSocket handler for subscriptions (Yoga)
    if (subscriptions?.enabled && subscriptions.websocket?.enabled !== false) {
      // Use separate path for WebSocket to avoid conflict with HTTP handlers
      const wsPath = subscriptions.websocket?.path || `${endpoint}/ws`
      nitro.options.handlers.push({
        route: wsPath,
        handler: 'nitro-graphql/nitro/routes/graphql-yoga-ws',
      })
    }
  }

  if (framework === 'apollo-server') {
    for (const method of GRAPHQL_HTTP_METHODS) {
      nitro.options.handlers.push({
        route: endpoint,
        handler: 'nitro-graphql/nitro/routes/apollo-server',
        method,
      })
    }

    // WebSocket handler for subscriptions (Apollo)
    if (subscriptions?.enabled && subscriptions.websocket?.enabled !== false) {
      // Use separate path for WebSocket to avoid conflict with HTTP handlers
      const wsPath = subscriptions.websocket?.path || `${endpoint}/ws`
      nitro.options.handlers.push({
        route: wsPath,
        handler: 'nitro-graphql/nitro/routes/apollo-server-ws',
      })
    }
  }

  // Health check endpoint
  nitro.options.handlers.push({
    route: nitro.options.runtimeConfig.graphql?.endpoint?.healthCheck || '/api/graphql/health',
    handler: 'nitro-graphql/nitro/routes/health',
    method: 'GET',
  })

  // Debug endpoint (development only)
  if (nitro.options.dev) {
    nitro.options.handlers.push({
      route: ENDPOINT_DEBUG,
      handler: 'nitro-graphql/nitro/routes/debug',
      method: 'GET',
    })
  }
}
