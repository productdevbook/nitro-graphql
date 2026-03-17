/**
 * Core Server Module
 *
 * Provides GraphQL server factories that work across different runtimes
 * (Node.js, Bun, Deno) using the web standard fetch API.
 *
 * Used by both:
 * - Nitro/Nuxt module (via H3 event handlers)
 * - Standalone CLI (via srvx)
 */

// Sandbox script
export { APOLLO_SANDBOX_CDN, createSandboxResponse, fetchSandboxScript } from './sandbox'

// Types
export type {
  CoreServerInstance,
  CoreServerOptions,
  ServerFactory,
} from './types'
export type { CoreSecurityConfig } from '../types/config'

// Server factories
export { apolloSandboxHtml, createYogaServer } from './yoga'
export { APOLLO_USER_FACING_ERROR_CODES, createApolloServerInstance } from './apollo'
