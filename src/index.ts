/**
 * nitro-graphql main entry point
 * Re-exports from ecosystem/nitro for backward compatibility
 */

// Default export: Nitro/Vite plugin
export { default } from './ecosystem/nitro'

// Named exports
export {
  NitroAdapter,
  resolveSecurityConfig,
  setupNitroGraphQL,
} from './ecosystem/nitro'

// Type exports
export type {
  ExternalGraphQLService,
  NitroGraphQLOptions,
  SecurityConfig,
} from './ecosystem/nitro'
