/**
 * CLI Dev Server
 *
 * Standalone GraphQL development server using srvx.
 * Runtime-agnostic: works on Node.js, Bun, and Deno.
 */

import type { CLIContext } from '../index'
import consola from 'consola'
import { plugin as ws } from 'crossws/server'
import { serve } from 'srvx'
import { createDebugHandler } from './debug-handler'
import { createGraphQLHandler, getServerInstance, reloadGraphQLHandler } from './graphql-handler'
import { createHealthHandler } from './health-handler'
import { createSandboxHandler } from './sandbox-handler'
import { createWebSocketPlugin } from './ws-handler'

const logger = consola.withTag('nitro-graphql')

export interface DevServerOptions {
  /** Server port (default: 4000) */
  port?: number
  /** Server hostname (default: localhost) */
  hostname?: string
  /** Open browser after start */
  open?: boolean
}

export interface DevServerInstance {
  /** The srvx server instance */
  server: ReturnType<typeof serve>
  /** Reload the GraphQL schema (for hot reload) */
  reload: () => Promise<void>
  /** Stop the server */
  close: () => Promise<void>
}

/**
 * Start the CLI development server
 *
 * Uses srvx for runtime-agnostic HTTP server.
 * GraphQL handled by the same core factory that Nitro uses.
 */
export async function startDevServer(
  ctx: CLIContext,
  options: DevServerOptions = {},
): Promise<DevServerInstance> {
  const port = options.port || 4000
  const hostname = options.hostname || 'localhost'
  const endpoint = ctx.config.endpoint?.graphql || '/graphql'

  logger.info('Starting GraphQL dev server...')

  // Create handlers using CORE server factory
  let graphqlHandler = await createGraphQLHandler(ctx)
  const healthHandler = createHealthHandler()
  const sandboxHandler = createSandboxHandler()
  const debugHandler = createDebugHandler(ctx)

  // Create WebSocket plugin for GraphQL subscriptions
  const wsPlugin = ws(createWebSocketPlugin(
    () => {
      const instance = getServerInstance()
      if (!instance) {
        throw new Error('GraphQL server not initialized')
      }
      return instance.schema
    },
  ))

  // Create srvx server with WebSocket support
  const server = serve({
    port,
    hostname,
    plugins: [wsPlugin],
    async fetch(request: Request) {
      const url = new URL(request.url)
      const path = url.pathname

      // Route matching
      if (path === endpoint || path === '/api/graphql') {
        return graphqlHandler(request)
      }

      // Apollo Sandbox script
      if (path === '/api/graphql/sandbox.js' || path === `${endpoint}/sandbox.js`) {
        return sandboxHandler(request)
      }

      if (path === '/health' || path === '/api/graphql/health') {
        return healthHandler(request)
      }

      // Debug dashboard
      if (path === '/_nitro/graphql/debug') {
        return debugHandler(request)
      }

      return new Response('Not Found', { status: 404 })
    },
  })

  // Wait for server to be ready
  await server.ready()

  logger.success(`GraphQL server running at http://${hostname}:${port}${endpoint}`)
  logger.info(`Health check at http://${hostname}:${port}/health`)
  logger.info(`Debug dashboard at http://${hostname}:${port}/_nitro/graphql/debug`)

  // Return server instance with reload capability
  return {
    server,
    async reload() {
      logger.info('Reloading GraphQL schema...')
      graphqlHandler = await reloadGraphQLHandler(ctx)
      logger.success('Schema reloaded!')
    },
    async close() {
      logger.info('Shutting down server...')
      await server.close()
      logger.success('Server stopped')
    },
  }
}
