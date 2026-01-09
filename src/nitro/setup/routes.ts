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
  const subscriptions = nitro.options.graphql?.subscriptions
  const endpoint = nitro.options.runtimeConfig.graphql?.endpoint?.graphql || '/api/graphql'

  // Main GraphQL endpoint (HTTP)
  if (framework === 'graphql-yoga') {
    for (const method of GRAPHQL_HTTP_METHODS) {
      nitro.options.handlers.push({
        route: endpoint,
        handler: join(runtime, 'graphql-yoga'),
        method,
      })
    }

    // Apollo Sandbox script proxy (cacheable)
    nitro.options.handlers.push({
      route: `${endpoint}/sandbox.js`,
      handler: join(runtime, 'apollo-sandbox-script'),
      method: 'GET',
    })

    // WebSocket handler for subscriptions (Yoga)
    if (subscriptions?.enabled && subscriptions.websocket?.enabled !== false) {
      // Use separate path for WebSocket to avoid conflict with HTTP handlers
      const wsPath = subscriptions.websocket?.path || `${endpoint}/ws`
      nitro.options.handlers.push({
        route: wsPath,
        handler: join(runtime, 'graphql-yoga-ws'),
      })
    }
  }

  if (framework === 'apollo-server') {
    for (const method of GRAPHQL_HTTP_METHODS) {
      nitro.options.handlers.push({
        route: endpoint,
        handler: join(runtime, 'apollo-server'),
        method,
      })
    }

    // WebSocket handler for subscriptions (Apollo)
    if (subscriptions?.enabled && subscriptions.websocket?.enabled !== false) {
      // Use separate path for WebSocket to avoid conflict with HTTP handlers
      const wsPath = subscriptions.websocket?.path || `${endpoint}/ws`
      nitro.options.handlers.push({
        route: wsPath,
        handler: join(runtime, 'apollo-server-ws'),
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
