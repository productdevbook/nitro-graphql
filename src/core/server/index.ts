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

// Types (CoreSecurityConfig is exported from core/types/config.ts)
export type {
  CoreServerInstance,
  CoreServerOptions,
  ServerFactory,
} from './types'

// Server factories (BASE_SCHEMA renamed to avoid conflict with schema/builder.ts)
export { apolloSandboxHtml, createYogaServer, BASE_SCHEMA as YOGA_BASE_SCHEMA } from './yoga'
