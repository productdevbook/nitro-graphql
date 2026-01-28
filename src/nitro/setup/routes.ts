/**
 * Route handler registration for GraphQL endpoints
 */

import type { Nitro } from 'nitro/types'
import { fileURLToPath } from 'node:url'
import { ENDPOINT_DEBUG, GRAPHQL_HTTP_METHODS } from '../../core/constants'

/**
 * Resolve a module specifier to an absolute filesystem path.
 * Uses import.meta.resolve() to handle both:
 * - Local development (monorepo symlinks resolve to local source)
 * - CI/Production (npm install resolves to node_modules)
 */
function resolveHandler(specifier: string): string {
  return fileURLToPath(import.meta.resolve(specifier))
}

/**
 * Register GraphQL route handlers
 *
 * Uses import.meta.resolve() to convert module specifiers to absolute paths.
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
        handler: resolveHandler('nitro-graphql/nitro/routes/graphql-yoga'),
        method,
      })
    }

    // Apollo Sandbox script proxy (cacheable)
    nitro.options.handlers.push({
      route: `${endpoint}/sandbox.js`,
      handler: resolveHandler('nitro-graphql/nitro/routes/apollo-sandbox-script'),
      method: 'GET',
    })

    // WebSocket handler for subscriptions (Yoga)
    if (subscriptions?.enabled && subscriptions.websocket?.enabled !== false) {
      // Use separate path for WebSocket to avoid conflict with HTTP handlers
      const wsPath = subscriptions.websocket?.path || `${endpoint}/ws`
      nitro.options.handlers.push({
        route: wsPath,
        handler: resolveHandler('nitro-graphql/nitro/routes/graphql-yoga-ws'),
      })
    }
  }

  if (framework === 'apollo-server') {
    for (const method of GRAPHQL_HTTP_METHODS) {
      nitro.options.handlers.push({
        route: endpoint,
        handler: resolveHandler('nitro-graphql/nitro/routes/apollo-server'),
        method,
      })
    }

    // WebSocket handler for subscriptions (Apollo)
    if (subscriptions?.enabled && subscriptions.websocket?.enabled !== false) {
      // Use separate path for WebSocket to avoid conflict with HTTP handlers
      const wsPath = subscriptions.websocket?.path || `${endpoint}/ws`
      nitro.options.handlers.push({
        route: wsPath,
        handler: resolveHandler('nitro-graphql/nitro/routes/apollo-server-ws'),
      })
    }
  }

  // Health check endpoint
  nitro.options.handlers.push({
    route: nitro.options.runtimeConfig.graphql?.endpoint?.healthCheck || '/api/graphql/health',
    handler: resolveHandler('nitro-graphql/nitro/routes/health'),
    method: 'GET',
  })

  // Debug endpoint (development only)
  if (nitro.options.dev) {
    nitro.options.handlers.push({
      route: ENDPOINT_DEBUG,
      handler: resolveHandler('nitro-graphql/nitro/routes/debug'),
      method: 'GET',
    })
  }
}
