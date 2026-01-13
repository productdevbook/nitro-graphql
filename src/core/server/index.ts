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
  CoreSecurityConfig,
  CoreServerInstance,
  CoreServerOptions,
  ServerFactory,
} from './types'

// Server factories
export { apolloSandboxHtml, BASE_SCHEMA, createYogaServer } from './yoga'
