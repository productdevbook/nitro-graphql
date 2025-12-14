import { defineNitroPlugin } from 'nitropack/runtime'

/**
 * Nitro runtime plugin for graceful WebSocket shutdown.
 * Registered when subscriptions are enabled.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', async () => {
    // Check and shutdown GraphQL Yoga WebSocket connections
    const yogaState = (globalThis as any).__nitro_graphql_ws_yoga__
    if (yogaState?.activePeers?.size > 0) {
      try {
        const { shutdownAllConnections } = await import('./graphql-yoga-ws')
        await shutdownAllConnections()
      }
      catch {
        // Module may not be loaded
      }
    }

    // Check and shutdown Apollo Server WebSocket connections
    const apolloState = (globalThis as any).__nitro_graphql_ws_apollo__
    if (apolloState?.activePeers?.size > 0) {
      try {
        const { shutdownAllConnections } = await import('./apollo-server-ws')
        await shutdownAllConnections()
      }
      catch {
        // Module may not be loaded
      }
    }
  })
})
